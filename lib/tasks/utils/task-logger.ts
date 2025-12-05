/**
 * 任务日志工具
 */

import { db } from '@/db'
import { taskLogs } from '@/db/schema'

// 支持 db 或事务上下文
type DbOrTransaction = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * 记录任务日志
 */
export async function logTask(
  taskId: number,
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, unknown>,
  dbOrTx: DbOrTransaction = db
): Promise<void> {
  await dbOrTx.insert(taskLogs).values({ taskId, level, message, data })
}

/**
 * 记录任务创建
 */
export async function logTaskCreated(
  taskId: number,
  estimatedCost: number,
  dbOrTx: DbOrTransaction = db
): Promise<void> {
  await logTask(taskId, 'info', '任务创建成功', { estimatedCost }, dbOrTx)
}

/**
 * 记录任务完成
 */
export async function logTaskCompleted(
  taskId: number,
  outputCount: number,
  actualCost: number,
  actualUsage?: number
): Promise<void> {
  await logTask(taskId, 'info', '任务完成', {
    outputCount,
    actualCost,
    actualUsage,
  })
}

/**
 * 记录任务失败
 */
export async function logTaskFailed(
  taskId: number,
  error: string,
  retryable: boolean,
  errorCode?: number,
  retryCount?: number
): Promise<void> {
  await logTask(taskId, 'error', error, {
    retryable,
    errorCode,
    retryCount,
  })
}

/**
 * 记录任务最终失败（不可重试或重试次数用尽）
 */
export async function logTaskFinalFailure(
  taskId: number,
  retryable: boolean,
  retryCount: number,
  maxRetries: number
): Promise<void> {
  await logTask(taskId, 'error', '任务最终失败（不可重试或重试次数用尽）', {
    retryable,
    retryCount,
    maxRetries,
  })
}

/**
 * 记录任务将重试
 */
export async function logTaskWillRetry(
  taskId: number,
  delay: number,
  retryCount: number,
  nextRetryAt: Date
): Promise<void> {
  await logTask(taskId, 'warn', `任务将在 ${delay} 秒后重试`, {
    retryCount,
    nextRetryAt: nextRetryAt.toISOString(),
  })
}

/**
 * 记录任务取消
 */
export async function logTaskCancelled(taskId: number): Promise<void> {
  await logTask(taskId, 'info', '任务已取消')
}