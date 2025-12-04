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
 * @returns 是否更新成功（false 表示任务已被其他进程处理）
 */
export async function resetTaskForRetry(
  taskId: number,
  retryCount: number,
  nextRetryAt: Date
): Promise<boolean> {
  const result = await db
    .update(tasks)
    .set({
      status: TaskStatus.PENDING,
      retryCount,
      nextRetryAt,
      externalTaskId: null,
    })
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
