/**
 * 任务执行器
 */

import { and, eq, lte } from 'drizzle-orm'

import { db } from '@/db'
import { pricing, tasks } from '@/db/schema'

import { env } from '../env'

import { providerRegistry } from './providers/registry'
import { refundTask, settleTask } from './billing'
import { ConfigurationError, ProviderNotFoundError } from './errors'
import { taskService } from './service'
import type { Task, TaskOutputResource, TaskResource, TaskResult } from './types'
import { TaskMode, TaskStatus } from './types'

/**
 * 计算重试延迟（指数退避）
 */
function calculateRetryDelay(retryCount: number): number {
  const baseDelay = 60 // 秒
  const maxDelay = 600 // 秒
  return Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)
}

/**
 * 执行任务（主循环调用）
 */
export async function executeTask(task: Task, inputs: TaskResource[]): Promise<void> {
  const provider = providerRegistry.get(task.type)

  if (!provider) {
    await handleFailure(task, `未找到 Provider: ${task.type}`, false)
    throw new ProviderNotFoundError(task.type)
  }

  try {
    const result = await provider.execute(task, inputs)

    if (!result.success) {
      await handleFailure(
        task,
        result.error || '执行失败',
        result.retryable ?? false,
        result.errorCode
      )
      return
    }
    // TODO: 处理同步任务
    // 如果是同步任务，则获取同步任务的结果，然后直接调用 handleCompletion

    // 异步任务：保存 externalTaskId，保持 processing 状态
    if (provider.mode === TaskMode.ASYNC && result.externalTaskId) {
      await taskService.updateStatus(task.id, TaskStatus.PROCESSING, {
        externalTaskId: result.externalTaskId,
        startedAt: new Date(),
      })
      await taskService.log(task.id, 'info', '异步任务已提交', {
        externalTaskId: result.externalTaskId,
      })
    }
  } catch (error) {
    const err = error as Error
    const isConfigError = err instanceof ConfigurationError
    await handleFailure(task, err.message, !isConfigError)
  }
}

/**
 * 查询异步任务状态（异步查询循环调用）
 */
export async function queryAsyncTask(task: Task): Promise<void> {
  const provider = providerRegistry.get(task.type)

  if (!provider) {
    await handleFailure(task, `未找到 Provider: ${task.type}`, false)
    return
  }

  try {
    const result = await provider.query(task)

    if (result.status === 'pending') {
      // 仍在处理中，跳过
      return
    }

    if (result.status === 'failed') {
      await handleFailure(
        task,
        result.error || '查询失败',
        result.retryable ?? false,
        result.errorCode
      )
      return
    }

    // 任务完成
    await handleCompletion(task, result.outputs || [], result.actualUsage)
  } catch (error) {
    const err = error as Error
    await handleFailure(task, err.message, true)
  }
}

/**
 * 处理任务完成
 */
async function handleCompletion(
  task: Task,
  outputs: TaskOutputResource[],
  actualUsage?: number
): Promise<void> {
  // 下载并上传输出资源到 TOS
  const uploadedOutputs =
    outputs.length > 0
      ? await taskService.addOutputResource(task.id, task.accountId, task.type, outputs)
      : []

  // 计算实际费用（如果有实际用量）
  let actualCost = task.estimatedCost
  if (actualUsage !== undefined && task.pricingId) {
    // 根据单价计算实际费用
    const pricingConfig = await db.query.pricing.findFirst({
      where: eq(pricing.id, task.pricingId),
    })

    if (!pricingConfig) {
      throw new Error(`未找到定价配置 ${task.pricingId}`)
    }

    if (pricingConfig.billingType !== 'per_unit') {
      throw new Error(`定价配置 ${task.pricingId} 的计费类型不是 per_unit，当前只支持按次计费`)
    }

    actualCost = Math.ceil(actualUsage * pricingConfig.unitPrice)
  }

  // 构建任务结果（使用 TOS 的 URL）
  const taskResults: TaskResult[] = uploadedOutputs.map((o) => ({
    url: o.url,
    ...o.metadata,
  }))

  // 更新任务状态
  await taskService.updateStatus(task.id, TaskStatus.COMPLETED, {
    completedAt: new Date(),
    actualCost,
    actualUsage: actualUsage?.toString(),
    result: taskResults,
  })

  // 结算（多退少补）
  const updatedTask = { ...task, estimatedCost: task.estimatedCost }
  await settleTask(updatedTask, actualCost)

  await taskService.log(task.id, 'info', '任务完成', {
    outputCount: uploadedOutputs.length,
    actualCost,
    actualUsage,
  })
}

/**
 * 处理任务失败
 */
async function handleFailure(
  task: Task,
  error: string,
  retryable: boolean,
  errorCode?: number
): Promise<void> {
  const maxRetries = env.TASK_MAX_RETRIES

  await taskService.log(task.id, 'error', error, {
    retryable,
    errorCode,
    retryCount: task.retryCount,
  })

  if (retryable && task.retryCount < maxRetries) {
    // 触发重试：重置为 pending，设置下次重试时间
    const delay = calculateRetryDelay(task.retryCount)
    const nextRetryAt = new Date(Date.now() + delay * 1000)

    await db
      .update(tasks)
      .set({
        status: TaskStatus.PENDING,
        retryCount: task.retryCount + 1,
        nextRetryAt,
        externalTaskId: null, // 清除外部任务ID，下次重新提交
      })
      .where(eq(tasks.id, task.id))

    await taskService.log(task.id, 'warn', `任务将在 ${delay} 秒后重试`, {
      retryCount: task.retryCount + 1,
      nextRetryAt: nextRetryAt.toISOString(),
    })
  } else {
    // 标记失败
    await taskService.updateStatus(task.id, TaskStatus.FAILED, {
      completedAt: new Date(),
    })

    await taskService.log(task.id, 'error', '任务失败（不可重试或重试次数用尽）', {
      retryable,
      retryCount: task.retryCount,
      maxRetries,
    })

    // 全额退款
    await refundTask(task)
  }
}

/**
 * 恢复超时任务
 */
export async function recoverTimeoutTasks(): Promise<number> {
  const timeoutMinutes = env.TASK_TIMEOUT_MINUTES
  const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000)

  // 查找超时的 processing 任务（updatedAt < threshold）
  const result = await db
    .update(tasks)
    .set({
      status: TaskStatus.PENDING,
      externalTaskId: null,
    })
    .where(and(eq(tasks.status, TaskStatus.PROCESSING), lte(tasks.updatedAt, timeoutThreshold)))
    .returning({ id: tasks.id })

  for (const { id } of result) {
    await taskService.log(id, 'warn', '任务超时，已重置为待处理状态')
  }

  return result.length
}
