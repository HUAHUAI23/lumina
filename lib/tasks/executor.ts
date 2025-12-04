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
    // 1. 获取输入资源
    const inputs = await db.query.taskResources.findMany({
      where: and(eq(taskResources.taskId, task.id), eq(taskResources.isInput, true)),
    })

    // 2. 执行任务
    const result = await provider.execute(task, inputs)

    if (!result.success) {
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

      logger.info({ taskId: task.id, externalTaskId: result.externalTaskId }, '异步任务已提交')
    }
  } catch (error) {
    const err = error as Error
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
      // 更新 updatedAt，证明任务仍在处理中（防止超时误判）
      await db
        .update(tasks)
        .set({ updatedAt: new Date() })
        .where(eq(tasks.id, task.id))
      return // 仍在处理中
    }

    if (result.status === 'failed') {
      await handler.handleFailure({
        task,
        error: result.error || '任务失败',
        retryable: result.retryable ?? false,
        errorCode: result.errorCode,
      })
      return
    }

    // 任务完成
    await handler.handleCompletion({
      task,
      outputs: result.outputs || [],
      actualUsage: result.actualUsage,
    })
  } catch (error) {
    const err = error as Error
    await handler.handleFailure({
      task,
      error: err.message,
      retryable: true,
    })
  }
}
