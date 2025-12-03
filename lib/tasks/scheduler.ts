/**
 * 任务调度器（双循环设计）
 */

import { Cron } from 'croner'
import { and, eq, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { taskResources, tasks } from '@/db/schema'

import { env } from '../env'
import { logger } from '../logger'

import { executeTask, queryAsyncTask, recoverTimeoutTasks } from './executor'
import { TaskMode, TaskStatus } from './types'

let mainLoopJob: Cron | null = null
let asyncPollJob: Cron | null = null
let isRunning = false

/**
 * 主循环：处理待执行任务
 */
async function runMainLoop(): Promise<void> {
  if (!isRunning) return

  const batchSize = env.TASK_BATCH_SIZE

  try {
    // 1. 领取待处理任务（使用 FOR UPDATE SKIP LOCKED 防止并发冲突）
    const pendingTasks = await db.transaction(async (tx) => {
      // 查询条件：pending 状态，且重试时间已到（或无重试时间）
      const claimed = await tx
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.status, TaskStatus.PENDING),
            or(isNull(tasks.nextRetryAt), lte(tasks.nextRetryAt, new Date()))
          )
        )
        .limit(batchSize)
        .for('update', { skipLocked: true })

      if (claimed.length === 0) return []

      // 更新状态为 processing
      const taskIds = claimed.map((t) => t.id)
      await tx
        .update(tasks)
        .set({
          status: TaskStatus.PROCESSING,
          startedAt: sql`COALESCE(${tasks.startedAt}, NOW())`,
        })
        .where(sql`${tasks.id} IN ${taskIds}`)

      return claimed
    })

    // 2. 执行任务
    for (const task of pendingTasks) {
      try {
        const inputs = await db.query.taskResources.findMany({
          where: and(eq(taskResources.taskId, task.id), eq(taskResources.isInput, true)),
        })

        await executeTask(task, inputs)
      } catch (error) {
        logger.error({ taskId: task.id, error }, '任务执行异常')
      }
    }

    // 3. 恢复超时任务
    const recovered = await recoverTimeoutTasks()
    if (recovered > 0) {
      logger.info({ count: recovered }, '恢复超时任务')
    }
  } catch (error) {
    logger.error({ error }, '主循环异常')
  }
}

/**
 * 异步查询循环：查询异步任务状态
 */
async function runAsyncPollLoop(): Promise<void> {
  if (!isRunning) return

  const batchSize = env.TASK_BATCH_SIZE

  try {
    // 查询 processing 状态且有 externalTaskId 的异步任务
    const asyncTasks = await db.query.tasks.findMany({
      where: and(
        eq(tasks.status, TaskStatus.PROCESSING),
        eq(tasks.mode, TaskMode.ASYNC),
        isNotNull(tasks.externalTaskId)
      ),
      limit: batchSize,
    })

    for (const task of asyncTasks) {
      try {
        await queryAsyncTask(task)
      } catch (error) {
        logger.error({ taskId: task.id, error }, '异步任务查询异常')
      }
    }
  } catch (error) {
    logger.error({ error }, '异步查询循环异常')
  }
}

/**
 * 启动调度器
 */
export function startScheduler(): void {
  if (isRunning) {
    logger.warn('调度器已在运行')
    return
  }

  if (!env.TASK_SCHEDULER_ENABLED) {
    logger.info('调度器已禁用')
    return
  }

  isRunning = true

  const mainInterval = env.TASK_SCHEDULER_INTERVAL
  const asyncInterval = env.TASK_ASYNC_POLL_INTERVAL

  // 主循环（每 N 秒）
  mainLoopJob = new Cron(`*/${mainInterval} * * * * *`, { protect: true }, runMainLoop)

  // 异步查询循环（每 N 秒）
  asyncPollJob = new Cron(`*/${asyncInterval} * * * * *`, { protect: true }, runAsyncPollLoop)

  logger.info({ mainInterval, asyncInterval }, '调度器已启动')
}

/**
 * 停止调度器
 */
export function stopScheduler(): void {
  isRunning = false

  if (mainLoopJob) {
    mainLoopJob.stop()
    mainLoopJob = null
  }

  if (asyncPollJob) {
    asyncPollJob.stop()
    asyncPollJob = null
  }

  logger.info('调度器已停止')
}

/**
 * 检查调度器状态
 */
export function isSchedulerRunning(): boolean {
  return isRunning
}

/**
 * 初始化调度器（用于 instrumentation.ts）
 */
export function initScheduler(): void {
  startScheduler()
}