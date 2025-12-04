/**
 * 默认 Handler 实现
 * 提供通用的完成和失败处理逻辑
 */

import { env } from '@/lib/env'
import { logger as baseLogger } from '@/lib/logger'

import { refundTask, settleTask } from '../billing'
import type { CompletionContext, CompletionResult, FailureContext } from '../core/context'
import { BaseHandler } from '../core/handler'
import { calculateActualCostFromUsage } from '../utils/cost'
import {
  calculateRetryDelay,
  markTaskAsCompleted,
  markTaskAsFailed,
  resetTaskForRetry,
  saveOutputResources,
} from '../utils/db'
import { uploadOutputResource } from '../utils/resource'
import {
  logTaskCompleted,
  logTaskFailed,
  logTaskFinalFailure,
  logTaskWillRetry,
} from '../utils/task-logger'

const logger = baseLogger.child({ module: 'tasks/handler' })

/**
 * 默认 Handler 实现
 * 提供通用的完成和失败处理逻辑
 */
export abstract class DefaultHandler extends BaseHandler {
  /**
   * 默认的完成处理流程
   */
  async handleCompletion(context: CompletionContext): Promise<CompletionResult> {
    const { task, outputs, actualUsage } = context

    try {
      // 1. 上传到 TOS
      const uploadedOutputs = await Promise.all(
        outputs.map((output, index) =>
          uploadOutputResource({
            taskId: task.id,
            accountId: task.accountId,
            taskType: task.type,
            output,
            index,
          })
        )
      )

      // 2. 计算实际费用和用量
      // 当 Provider 未返回 actualUsage 时，使用预估值
      const finalActualUsage =
        actualUsage !== undefined ? actualUsage : Number(task.estimatedUsage || 0)
      const finalActualCost = await calculateActualCostFromUsage(task, finalActualUsage)

      // 3. 保存资源到数据库
      await saveOutputResources(task.id, uploadedOutputs)

      // 4. 构建任务结果
      const taskResults = uploadedOutputs.map((o) => ({
        url: o.url,
        ...o.metadata,
      }))

      // 5. 更新任务状态为完成（带条件检查，防止并发覆盖）
      const updated = await markTaskAsCompleted(
        task.id,
        finalActualCost,
        finalActualUsage,
        taskResults
      )

      if (!updated) {
        // 任务状态已被其他进程更新，跳过后续处理
        logger.warn({ taskId: task.id }, '任务状态已变更，跳过完成处理')
        return {
          uploadedOutputs,
          actualCost: finalActualCost,
        }
      }

      // 只有预付费会有这个逻辑
      // 6. 结算费用（多退少补）
      await settleTask(task, finalActualCost)

      // 7. 记录完成日志
      await logTaskCompleted(task.id, uploadedOutputs.length, finalActualCost, finalActualUsage)

      logger.info(
        {
          taskId: task.id,
          outputCount: uploadedOutputs.length,
          actualCost: finalActualCost,
          actualUsage: finalActualUsage,
          usedEstimatedValue: actualUsage === undefined,
        },
        '任务完成'
      )

      return {
        uploadedOutputs,
        actualCost: finalActualCost,
      }
    } catch (error) {
      const err = error as Error
      logger.error({ taskId: task.id, error: err.message }, '完成任务时出错')
      throw error
    }
  }

  /**
   * 默认的失败处理
   */
  async handleFailure(context: FailureContext): Promise<void> {
    const { task, error, errorCode, retryable } = context

    // 1. 记录失败日志
    await logTaskFailed(task.id, error, retryable, errorCode, task.retryCount)

    // 2. 判断是否重试
    const maxRetries = env.TASK_MAX_RETRIES
    if (retryable && task.retryCount < maxRetries) {
      // 重试逻辑
      const delay = calculateRetryDelay(task.retryCount)
      const nextRetryAt = new Date(Date.now() + delay * 1000)

      // 失败重试（带条件检查）
      const updated = await resetTaskForRetry(task.id, task.retryCount + 1, nextRetryAt)
      if (!updated) {
        logger.warn({ taskId: task.id }, '任务状态已变更，跳过重试处理')
        return
      }

      await logTaskWillRetry(task.id, delay, task.retryCount + 1, nextRetryAt)
      logger.warn({ taskId: task.id, delay, retryCount: task.retryCount + 1 }, '任务将重试')
    } else {
      // 标记失败并退款（带条件检查）
      const updated = await markTaskAsFailed(task.id)
      if (!updated) {
        logger.warn({ taskId: task.id }, '任务状态已变更，跳过失败处理')
        return
      }

      await refundTask(task)

      // 记录最终失败日志
      await logTaskFinalFailure(task.id, retryable, task.retryCount, maxRetries)

      logger.error({ taskId: task.id, error, retryable }, '任务最终失败')
    }

    // 3. 子类可以重写 onFailure 方法添加特殊处理（如发送告警）
    await this.onFailure?.(context)
  }

  /**
   * 子类可重写此方法添加失败时的额外处理
   */
  protected async onFailure?(_context: FailureContext): Promise<void>
}
