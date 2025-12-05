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

    logger.info(
      {
        taskId: task.id,
        taskType: task.type,
        outputCount: outputs.length,
        retryCount: task.retryCount,
      },
      '✅ [Handler] 任务成功，开始处理完成逻辑'
    )

    try {
      // 1. 上传到 TOS
      logger.info(
        { taskId: task.id, outputCount: outputs.length },
        '📤 [Handler] 开始上传输出资源到TOS'
      )

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

      logger.info(
        { taskId: task.id, uploadedCount: uploadedOutputs.length },
        '✅ [Handler] 输出资源上传完成'
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
          taskType: task.type,
          outputCount: uploadedOutputs.length,
          actualCost: finalActualCost,
          actualUsage: finalActualUsage,
          estimatedCost: task.estimatedCost,
          usedEstimatedValue: actualUsage === undefined,
          retryCount: task.retryCount,
        },
        `🎉 [Handler] 任务完成！实际费用: ${finalActualCost}，预估费用: ${task.estimatedCost}`
      )

      return {
        uploadedOutputs,
        actualCost: finalActualCost,
      }
    } catch (error) {
      const err = error as Error
      logger.error(
        { taskId: task.id, error: err.message, stack: err.stack },
        '❌ [Handler] 完成任务时出错'
      )
      throw error
    }
  }

  /**
   * 默认的失败处理
   */
  async handleFailure(context: FailureContext): Promise<void> {
    const { task, error, errorCode, retryable, requestId } = context

    logger.error(
      {
        taskId: task.id,
        taskType: task.type,
        taskMode: task.mode,
        error,
        errorCode,
        retryable,
        retryCount: task.retryCount,
        hasExternalTaskId: !!task.externalTaskId,
      },
      '⚠️ [Handler] 任务失败，开始处理失败逻辑'
    )

    // 1. 记录失败日志
    await logTaskFailed(task.id, error, retryable, errorCode, task.retryCount, requestId)

    const maxRetries = env.TASK_MAX_RETRIES

    // 2. 同步任务：不走系统重试，直接失败（重试由Provider内部处理）
    if (task.mode === 'sync') {
      const updated = await markTaskAsFailed(task.id)
      if (!updated) {
        logger.warn({ taskId: task.id }, '任务状态已变更，跳过失败处理')
        return
      }

      await refundTask(task)
      await logTaskFinalFailure(task.id, retryable, task.retryCount, maxRetries)

      logger.error(
        {
          taskId: task.id,
          taskType: task.type,
          error,
          errorCode,
          retryable,
        },
        '❌ [Handler] 同步任务失败，不走系统重试（重试由Provider处理），已退款'
      )

      await this.onFailure?.(context)
      return
    }

    // 3. 异步任务：判断是否重试
    if (retryable && task.retryCount < maxRetries) {
      const delay = calculateRetryDelay(task.retryCount)
      const nextRetryAt = new Date(Date.now() + delay * 1000)

      // 判断是否需要清空 externalTaskId
      // - 无 externalTaskId：提交失败，重试时需要重新提交
      // - 有 externalTaskId：查询失败，重试时继续查询原任务
      const shouldClearExternalId = !task.externalTaskId

      const updated = await resetTaskForRetry(
        task.id,
        task.retryCount + 1,
        nextRetryAt,
        shouldClearExternalId
      )

      if (!updated) {
        logger.warn({ taskId: task.id }, '任务状态已变更，跳过重试处理')
        return
      }

      await logTaskWillRetry(task.id, delay, task.retryCount + 1, nextRetryAt)

      logger.warn(
        {
          taskId: task.id,
          taskType: task.type,
          delay,
          retryCount: task.retryCount + 1,
          maxRetries,
          nextRetryAt,
          hasExternalTaskId: !!task.externalTaskId,
          willResubmit: shouldClearExternalId,
        },
        shouldClearExternalId
          ? `🔄 [Handler] 异步任务提交失败，将在 ${delay}秒后重新提交（第 ${
              task.retryCount + 1
            }/${maxRetries} 次）`
          : `🔄 [Handler] 异步任务查询失败，将在 ${delay}秒后继续查询原任务（第 ${
              task.retryCount + 1
            }/${maxRetries} 次）`
      )
    } else {
      // 标记失败并退款（带条件检查）
      const updated = await markTaskAsFailed(task.id)
      if (!updated) {
        logger.warn({ taskId: task.id }, '任务状态已变更，跳过失败处理')
        return
      }

      await refundTask(task)
      await logTaskFinalFailure(task.id, retryable, task.retryCount, maxRetries)

      const reason = retryable
        ? `已达到最大重试次数 (${task.retryCount}/${maxRetries})`
        : '不可重试的错误'

      logger.error(
        {
          taskId: task.id,
          taskType: task.type,
          error,
          errorCode,
          retryable,
          retryCount: task.retryCount,
          maxRetries,
          reason,
        },
        `❌ [Handler] 异步任务最终失败 - ${reason}，已退款`
      )
    }

    // 4. 子类可以重写 onFailure 方法添加特殊处理（如发送告警）
    await this.onFailure?.(context)
  }

  /**
   * 子类可重写此方法添加失败时的额外处理
   */
  protected async onFailure?(_context: FailureContext): Promise<void>
}
