/**
 * 数据库操作工具
 */

import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import type { TaskResult } from '@/db/schema'
import { taskResources, tasks } from '@/db/schema'

import type { TaskOutputResource, TaskStatusType } from '../types'
import { TaskStatus } from '../types'

/**
 * 更新任务状态为完成
 * 只有当任务处于 PROCESSING 状态时才能更新
 * @returns 是否更新成功（false 表示任务已被其他进程处理）
 */
export async function markTaskAsCompleted(
  taskId: number,
  actualCost: number,
  actualUsage: number | undefined,
  taskResults: TaskResult[]
): Promise<boolean> {
  const result = await db
    .update(tasks)
    .set({
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
      actualCost,
      actualUsage: actualUsage?.toString(),
      result: taskResults,
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.status, TaskStatus.PROCESSING)))

  return (result.rowCount ?? 0) > 0
}

/**
 * 更新任务状态为失败
 * 只有当任务处于 PROCESSING 状态时才能更新
 * @returns 是否更新成功（false 表示任务已被其他进程处理）
 */
export async function markTaskAsFailed(taskId: number): Promise<boolean> {
  const result = await db
    .update(tasks)
    .set({
      status: TaskStatus.FAILED,
      completedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.status, TaskStatus.PROCESSING)))

  return (result.rowCount ?? 0) > 0
}

/**
 * 重置任务为待重试状态
 * 只有当任务处于 PROCESSING 状态时才能更新
 * @param taskId 任务ID
 * @param retryCount 重试次数
 * @param nextRetryAt 下次重试时间
 * @param clearExternalTaskId 是否清空外部任务ID
 *   - true: 清空，重试时重新提交/执行任务
 *   - false: 保留，重试时继续查询原任务（默认）
 * @returns 是否更新成功（false 表示任务已被其他进程处理）
 */
export async function resetTaskForRetry(
  taskId: number,
  retryCount: number,
  nextRetryAt: Date,
  clearExternalTaskId = false
): Promise<boolean> {
  const updateData: {
    status: TaskStatusType
    retryCount: number
    nextRetryAt: Date
    externalTaskId?: null
  } = {
    status: TaskStatus.PENDING,
    retryCount,
    nextRetryAt,
  }

  // 只有明确要求时才清空 externalTaskId
  // 场景1：异步任务提交失败 → 重试时需要重新提交
  // 场景2：同步任务超时 → 重试时需要重新执行
  // 场景3：异步任务查询失败但已有externalTaskId → 保留，继续查询
  if (clearExternalTaskId) {
    updateData.externalTaskId = null
  }

  const result = await db
    .update(tasks)
    .set(updateData)
    .where(and(eq(tasks.id, taskId), eq(tasks.status, TaskStatus.PROCESSING)))

  return (result.rowCount ?? 0) > 0
}

/**
 * 更新任务状态（通用方法）
 */
export async function updateTaskStatus(
  taskId: number,
  status: TaskStatusType,
  extra?: {
    externalTaskId?: string
    startedAt?: Date
    completedAt?: Date
    actualCost?: number
    actualUsage?: string
    result?: TaskResult[]
  }
): Promise<void> {
  await db
    .update(tasks)
    .set({ status, ...extra })
    .where(eq(tasks.id, taskId))
}

/**
 * 计算重试延迟（指数退避）
 */
export function calculateRetryDelay(retryCount: number): number {
  const baseDelay = 60 // 秒
  const maxDelay = 600 // 秒
  return Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)
}

/**
 * 保存输出资源到数据库
 */
export async function saveOutputResources(
  taskId: number,
  outputs: TaskOutputResource[]
): Promise<void> {
  if (outputs.length === 0) return

  await db.insert(taskResources).values(
    outputs.map((output) => ({
      taskId,
      resourceType: output.type,
      isInput: false,
      url: output.url,
      metadata: output.metadata || {},
    }))
  )
}
