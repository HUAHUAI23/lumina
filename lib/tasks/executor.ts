/**
 * 任务执行器（重构版）
 * 纯调度器，业务逻辑由 Handler 处理
 */

import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { taskResources, tasks } from '@/db/schema'
import { logger as baseLogger } from '@/lib/logger'

import { handlerRegistry } from './handlers/registry'
import { providerRegistry } from './providers/registry'
import { logTask } from './utils/task-logger'
import type { Task } from './types'

const logger = baseLogger.child({ module: 'tasks/executor' })

/**
 * 执行任务（主循环调用）
 */
export async function executeTask(task: Task): Promise<void> {
  logger.info(
    {
      taskId: task.id,
      taskType: task.type,
      retryCount: task.retryCount,
    },
    '🚀 [执行器] 开始执行任务'
  )

  const provider = providerRegistry.get(task.type)
  if (!provider) {
    const error = `未找到 Provider: ${task.type}`
    logger.error({ taskId: task.id, taskType: task.type }, error)
    await logTask(task.id, 'error', error)
    return
  }

  const handler = handlerRegistry.get(task.type)
  if (!handler) {
    const error = `未找到 Handler: ${task.type}`
    logger.error({ taskId: task.id, taskType: task.type }, error)
    await logTask(task.id, 'error', error)
    return
  }

  try {
    // 🟢 异步任务特殊处理：如果已有 externalTaskId，说明任务已提交成功
    // 这种情况通常发生在查询失败后的重试，不需要重新提交，直接等待查询循环
    if (provider.mode === 'async' && task.externalTaskId) {
      logger.info(
        {
          taskId: task.id,
          externalTaskId: task.externalTaskId,
          retryCount: task.retryCount,
        },
        '✅ [执行器] 异步任务已有外部ID，跳过提交，等待查询循环'
      )
      // 不需要执行任何操作，异步查询循环会处理
      return
    }

    // 1. 获取输入资源
    const inputs = await db.query.taskResources.findMany({
      where: and(eq(taskResources.taskId, task.id), eq(taskResources.isInput, true)),
    })

    logger.info(
      { taskId: task.id, inputCount: inputs.length },
      '📂 [执行器] 已加载输入资源'
    )

    // 2. 执行任务
    const result = await provider.execute(task, inputs)

    if (!result.success) {
      logger.error(
        {
          taskId: task.id,
          error: result.error,
          errorCode: result.errorCode,
          retryable: result.retryable,
          retryCount: task.retryCount,
        },
        result.retryable
          ? '⚠️ [执行器] 任务执行失败（可重试），交给Handler处理'
          : '❌ [执行器] 任务执行失败（不可重试），交给Handler处理'
      )

      await handler.handleFailure({
        task,
        error: result.error || '执行失败',
        retryable: result.retryable ?? false,
        errorCode: result.errorCode,
      })
      return
    }

    // 3. 处理结果
    if (provider.mode === 'sync') {
      logger.info({ taskId: task.id }, '✅ [执行器] 同步任务执行成功，交给Handler处理完成逻辑')

      // 同步任务：直接完成
      await handler.handleCompletion({
        task,
        outputs: result.outputs || [],
        actualUsage: result.actualUsage,
      })
    } else {
      // 异步任务：保存 externalTaskId，等待查询循环
      await db
        .update(tasks)
        .set({
          externalTaskId: result.externalTaskId,
          startedAt: new Date(),
        })
        .where(eq(tasks.id, task.id))

      logger.info(
        { taskId: task.id, externalTaskId: result.externalTaskId },
        '✅ [执行器] 异步任务已提交，等待查询循环'
      )
    }
  } catch (error) {
    const err = error as Error
    logger.error(
      {
        taskId: task.id,
        error: err.message,
        stack: err.stack,
        retryCount: task.retryCount,
      },
      '⚠️ [执行器] 任务执行异常（可重试），交给Handler处理'
    )

    await handler.handleFailure({
      task,
      error: err.message,
      retryable: true,
    })
  }
}

/**
 * 查询异步任务（异步查询循环调用）
 */
export async function queryAsyncTask(task: Task): Promise<void> {
  logger.info(
    {
      taskId: task.id,
      taskType: task.type,
      externalTaskId: task.externalTaskId,
    },
    '🔄 [执行器] 开始查询异步任务状态'
  )

  const provider = providerRegistry.get(task.type)
  if (!provider) {
    const error = `未找到 Provider: ${task.type}`
    logger.error({ taskId: task.id, taskType: task.type }, error)
    await logTask(task.id, 'error', error)
    return
  }

  const handler = handlerRegistry.get(task.type)
  if (!handler) {
    const error = `未找到 Handler: ${task.type}`
    logger.error({ taskId: task.id, taskType: task.type }, error)
    await logTask(task.id, 'error', error)
    return
  }

  try {
    const result = await provider.query(task)

    if (result.status === 'pending') {
      logger.info({ taskId: task.id }, '⏳ [执行器] 任务仍在处理中，更新时间戳')

      // 更新 updatedAt，证明任务仍在处理中（防止超时误判）
      await db
        .update(tasks)
        .set({ updatedAt: new Date() })
        .where(eq(tasks.id, task.id))
      return // 仍在处理中
    }

    if (result.status === 'failed') {
      logger.error(
        {
          taskId: task.id,
          error: result.error,
          errorCode: result.errorCode,
          retryable: result.retryable,
          retryCount: task.retryCount,
        },
        result.retryable
          ? '⚠️ [执行器] 异步任务查询结果为失败（可重试），交给Handler处理'
          : '❌ [执行器] 异步任务查询结果为失败（不可重试），交给Handler处理'
      )

      await handler.handleFailure({
        task,
        error: result.error || '任务失败',
        retryable: result.retryable ?? false,
        errorCode: result.errorCode,
      })
      return
    }

    // 任务完成
    logger.info(
      { taskId: task.id, outputCount: result.outputs?.length || 0 },
      '🎉 [执行器] 异步任务查询结果为成功，交给Handler处理完成逻辑'
    )

    await handler.handleCompletion({
      task,
      outputs: result.outputs || [],
      actualUsage: result.actualUsage,
    })
  } catch (error) {
    const err = error as Error
    logger.error(
      {
        taskId: task.id,
        error: err.message,
        stack: err.stack,
        retryCount: task.retryCount,
      },
      '⚠️ [执行器] 异步任务查询异常（可重试），交给Handler处理'
    )

    await handler.handleFailure({
      task,
      error: err.message,
      retryable: true,
    })
  }
}
