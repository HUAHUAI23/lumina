/**
 * 任务调度器（双循环设计）
 */

import { Cron } from 'croner'
import { and, eq, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { tasks } from '@/db/schema'
import { logger as baseLogger } from '@/lib/logger'

import { env } from '../env'

import { calculateRetryDelay, markTaskAsFailed, resetTaskForRetry } from './utils/db'
import { logTaskFinalFailure, logTaskWillRetry } from './utils/task-logger'
import { refundTask } from './billing'
import { executeTask, queryAsyncTask } from './executor'
import { TaskMode, TaskStatus } from './types'

const logger = baseLogger.child({ module: 'tasks/scheduler' })

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

    if (pendingTasks.length > 0) {
      logger.info({ count: pendingTasks.length }, '🔄 [主循环] 领取到待处理任务')
    }

    // 2. 执行任务
    for (const task of pendingTasks) {
      try {
        await executeTask(task)
      } catch (error) {
        logger.error({ taskId: task.id, error }, '任务执行异常')
      }
    }

    // 3. 恢复超时任务
    const recovered = await recoverTimeoutTasks()
    if (recovered > 0) {
      logger.info({ count: recovered }, '♻️ [主循环] 已恢复超时任务')
    }
  } catch (error) {
    const err = error as Error
    logger.error(
      {
        error: err.message,
        stack: err.stack,
        name: err.name,
        code: (err as any).code,
      },
      '❌ [主循环] 主循环执行异常'
    )
  }
}

/**
 * 异步查询循环：查询异步任务状态
 * 使用 FOR UPDATE SKIP LOCKED 防止多副本并发处理同一任务
 */
async function runAsyncPollLoop(): Promise<void> {
  if (!isRunning) return

  const batchSize = env.TASK_BATCH_SIZE
  const queriedTaskIds = new Set<number>()

  try {
    // 批量领取所有待查询的异步任务（一次事务）
    const tasksToQuery = await db.transaction(async (tx) => {
      const claimed = await tx
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.status, TaskStatus.PROCESSING),
            eq(tasks.mode, TaskMode.ASYNC),
            isNotNull(tasks.externalTaskId)
          )
        )
        .limit(batchSize)
        .for('update', { skipLocked: true })

      return claimed
    })

    // 处理每个任务
    for (const task of tasksToQuery) {
      // 防止重复查询
      if (queriedTaskIds.has(task.id)) {
        logger.warn({ taskId: task.id }, '⚠️ [异步查询循环] 检测到重复任务，跳过')
        continue
      }

      queriedTaskIds.add(task.id)

      try {
        await queryAsyncTask(task)
      } catch (error) {
        const err = error as Error
        logger.error(
          { taskId: task.id, error: err.message, stack: err.stack },
          '❌ [异步查询循环] 单个任务查询异常'
        )
      }
    }

    if (queriedTaskIds.size > 0) {
      logger.info({ count: queriedTaskIds.size }, '🔄 [异步查询循环] 已查询异步任务')
    }
  } catch (error) {
    const err = error as Error
    logger.error(
      {
        error: err.message,
        stack: err.stack,
        name: err.name,
        code: (err as any).code,
      },
      '❌ [异步查询循环] 循环执行异常'
    )
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

/**
 * 恢复超时任务（计入重试次数，同步/异步任务分别判断）
 * 使用 FOR UPDATE SKIP LOCKED 防止多副本并发处理同一超时任务
 */
async function recoverTimeoutTasks(): Promise<number> {
  const syncTimeout = env.TASK_TIMEOUT_MINUTES
  const asyncTimeout = env.TASK_ASYNC_TIMEOUT_MINUTES
  const maxRetries = env.TASK_MAX_RETRIES
  const batchSize = env.TASK_BATCH_SIZE

  const syncThreshold = new Date(Date.now() - syncTimeout * 60 * 1000)
  const asyncThreshold = new Date(Date.now() - asyncTimeout * 60 * 1000)

  let recoveredCount = 0

  // 逐个领取并处理超时任务
  for (let i = 0; i < batchSize; i++) {
    // 领取一个超时任务（使用 FOR UPDATE SKIP LOCKED）
    const task = await db.transaction(async (tx) => {
      const [claimed] = await tx
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.status, TaskStatus.PROCESSING),
            or(
              // 同步任务超时
              and(eq(tasks.mode, TaskMode.SYNC), lte(tasks.updatedAt, syncThreshold)),
              // 异步任务超时
              and(eq(tasks.mode, TaskMode.ASYNC), lte(tasks.updatedAt, asyncThreshold))
            )
          )
        )
        .limit(1)
        .for('update', { skipLocked: true })

      return claimed
    })

    if (!task) break // 没有更多超时任务

    recoveredCount++

    logger.warn(
      {
        taskId: task.id,
        taskType: task.type,
        retryCount: task.retryCount,
        maxRetries,
        mode: task.mode,
      },
      '⏱️ [超时恢复] 检测到超时任务'
    )

    if (task.retryCount < maxRetries) {
      // 未达到最大重试次数：增加 retryCount 并重试
      const delay = calculateRetryDelay(task.retryCount)
      const nextRetryAt = new Date(Date.now() + delay * 1000)

      // 判断是否需要清空 externalTaskId
      // - 同步任务：清空，重新执行
      // - 异步任务：保留，继续查询原任务
      const shouldClearExternalId = task.mode === TaskMode.SYNC

      // 超时重试（带条件检查）
      const updated = await resetTaskForRetry(
        task.id,
        task.retryCount + 1,
        nextRetryAt,
        shouldClearExternalId
      )

      if (!updated) {
        logger.warn({ taskId: task.id }, '任务状态已变更，跳过超时恢复')
        continue
      }

      await logTaskWillRetry(task.id, delay, task.retryCount + 1, nextRetryAt)

      logger.warn(
        {
          taskId: task.id,
          taskType: task.type,
          taskMode: task.mode,
          retryCount: task.retryCount + 1,
          maxRetries,
          delay,
          nextRetryAt,
          hasExternalTaskId: !!task.externalTaskId,
          willResubmit: shouldClearExternalId,
        },
        task.mode === TaskMode.SYNC
          ? `🔄 [超时恢复] 同步任务超时，将在 ${delay}秒后重新执行（第 ${task.retryCount + 1}/${maxRetries} 次）`
          : `🔄 [超时恢复] 异步任务超时，将在 ${delay}秒后继续查询原任务（第 ${task.retryCount + 1}/${maxRetries} 次）`
      )
    } else {
      // 达到最大重试次数：标记失败并退款（带条件检查）
      const updated = await markTaskAsFailed(task.id)
      if (!updated) {
        logger.warn({ taskId: task.id }, '任务状态已变更，跳过超时失败处理')
        continue
      }

      await refundTask(task)
      await logTaskFinalFailure(task.id, true, task.retryCount, maxRetries)

      logger.error(
        {
          taskId: task.id,
          taskType: task.type,
          retryCount: task.retryCount,
          maxRetries,
        },
        `❌ [超时恢复] 任务超时且已达到最大重试次数 (${task.retryCount}/${maxRetries})，已标记失败并退款`
      )
    }
  }

  return recoveredCount
}
