/**
 * 工作流调度器
 * 负责定期 reconcile 运行中的工作流任务
 */

import { Cron } from 'croner'
import { eq } from 'drizzle-orm'
import pLimit from 'p-limit'

import { db } from '@/db'
import { workflowTasks } from '@/db/schema'
import { logger as baseLogger } from '@/lib/logger'

import { workflowExecutor } from './engine/executor'
import { WorkflowStatus } from './types'

const logger = baseLogger.child({ module: 'workflows/scheduler' })

/** 工作流调度器配置 */
interface WorkflowSchedulerConfig {
  /** 是否启用调度器 */
  enabled: boolean
  /** reconcile 间隔（秒） */
  interval: number
  /** 每次批量处理的最大数量 */
  batchSize: number
  /** 并发执行数量 */
  concurrency: number
}

/** 默认配置 */
const DEFAULT_CONFIG: WorkflowSchedulerConfig = {
  enabled: true,
  interval: 10, // 每 10 秒执行一次
  batchSize: 20,
  concurrency: 5,
}

let job: Cron | null = null
let isRunning = false
let config: WorkflowSchedulerConfig = DEFAULT_CONFIG

/**
 * Reconcile 循环
 */
async function runReconcileLoop(): Promise<void> {
  if (!isRunning) return

  try {
    // 获取运行中的工作流任务（使用 FOR UPDATE SKIP LOCKED 防止并发冲突）
    const runningTasks = await db.transaction(async (tx) => {
      return tx
        .select()
        .from(workflowTasks)
        .where(eq(workflowTasks.status, WorkflowStatus.RUNNING))
        .limit(config.batchSize)
        .for('update', { skipLocked: true })
    })

    if (runningTasks.length === 0) {
      return
    }

    logger.info({ count: runningTasks.length }, '开始 reconcile 工作流任务')

    // 并行执行 reconcile
    const limit = pLimit(config.concurrency)
    const results = await Promise.all(
      runningTasks.map((task) =>
        limit(async () => {
          try {
            const hasMoreWork = await workflowExecutor.reconcile(task)
            return { taskId: task.id, hasMoreWork, error: null }
          } catch (error) {
            const err = error as Error
            logger.error(
              {
                workflowTaskId: task.id,
                error: err.message,
                stack: err.stack,
              },
              '工作流 reconcile 失败'
            )
            return { taskId: task.id, hasMoreWork: false, error: err.message }
          }
        })
      )
    )

    // 统计结果
    const completed = results.filter((r) => !r.hasMoreWork && !r.error).length
    const continuing = results.filter((r) => r.hasMoreWork).length
    const failed = results.filter((r) => r.error).length

    if (completed > 0 || failed > 0) {
      logger.info(
        {
          total: runningTasks.length,
          completed,
          continuing,
          failed,
        },
        'Reconcile 完成'
      )
    }
  } catch (error) {
    const err = error as Error
    logger.error(
      {
        error: err.message,
        stack: err.stack,
      },
      'Reconcile 循环异常'
    )
  }
}

/**
 * 启动调度器
 */
export function startWorkflowScheduler(customConfig?: Partial<WorkflowSchedulerConfig>): void {
  if (isRunning) {
    logger.warn('工作流调度器已在运行')
    return
  }

  // 合并配置
  config = { ...DEFAULT_CONFIG, ...customConfig }

  if (!config.enabled) {
    logger.info('工作流调度器已禁用')
    return
  }

  isRunning = true

  // 创建定时任务
  job = new Cron(`*/${config.interval} * * * * *`, { protect: true }, runReconcileLoop)

  logger.info(
    {
      interval: config.interval,
      batchSize: config.batchSize,
      concurrency: config.concurrency,
    },
    '工作流调度器已启动'
  )
}

/**
 * 停止调度器
 */
export function stopWorkflowScheduler(): void {
  isRunning = false

  if (job) {
    job.stop()
    job = null
  }

  logger.info('工作流调度器已停止')
}

/**
 * 检查调度器状态
 */
export function isWorkflowSchedulerRunning(): boolean {
  return isRunning
}

/**
 * 手动触发一次 reconcile（用于测试或即时触发）
 */
export async function triggerReconcile(): Promise<void> {
  await runReconcileLoop()
}

/**
 * 获取当前配置
 */
export function getSchedulerConfig(): WorkflowSchedulerConfig {
  return { ...config }
}