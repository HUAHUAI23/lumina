/**
 * 任务服务
 */

import { and, count, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { taskResources, tasks } from '@/db/schema'

import { logTaskCancelled, logTaskCreated } from './utils/task-logger'
import {
  calculateImageEstimatedCost,
  calculateVideoEstimatedCost,
  chargeForTask,
  refundTask,
} from './billing'
import { TaskNotFoundError } from './errors'
import type { CreateTaskParams } from './types'
import { TASK_TYPE_TO_CATEGORY, TASK_TYPE_TO_MODE, TaskCategory, TaskStatus } from './types'

/**
 * 创建任务 (预扣费)
 */
async function create(params: CreateTaskParams) {
  const { accountId, name, type, config, inputs, estimatedDuration, estimatedCount } = params

  const category = TASK_TYPE_TO_CATEGORY[type]
  const mode = TASK_TYPE_TO_MODE[type]
  // 计算预估费用和用量
  const { cost, estimatedUsage, pricing } =
    category === TaskCategory.VIDEO
      ? await calculateVideoEstimatedCost(type, estimatedDuration, estimatedCount)
      : category === TaskCategory.IMAGE
      ? await calculateImageEstimatedCost(type, estimatedCount)
      : (() => {
          throw new Error(`不支持的任务类别: ${category}`)
        })()

  return db.transaction(async (tx) => {
    // 预扣费（会检查余额）
    // 先创建任务获取 ID
    const [task] = await tx
      .insert(tasks)
      .values({
        accountId,
        name: name || '',
        category,
        type,
        mode,
        status: TaskStatus.PENDING,
        config,
        pricingId: pricing.id,
        billingType: pricing.billingType,
        estimatedCost: cost,
        estimatedUsage: estimatedUsage.toString(),
      })
      .returning()

    // 扣费
    await chargeForTask(tx, accountId, task.id, cost)

    // 创建输入资源记录
    if (inputs.length > 0) {
      await tx.insert(taskResources).values(
        inputs.map((input) => ({
          taskId: task.id,
          resourceType: input.type,
          isInput: true,
          url: input.url,
          metadata: input.metadata || {},
        }))
      )
    }

    // 记录日志
    await logTaskCreated(task.id, cost)

    return task
  })
}

/**
 * 取消任务
 * 使用事务 + FOR UPDATE 防止竞态条件
 */
async function cancel(taskId: number): Promise<void> {
  const task = await db.transaction(async (tx) => {
    // 使用 FOR UPDATE 锁定任务行，确保状态检查和更新原子性
    const [lockedTask] = await tx
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .for('update')

    if (!lockedTask) {
      throw new TaskNotFoundError(taskId)
    }

    if (lockedTask.status !== TaskStatus.PENDING) {
      throw new Error(`只能取消待处理状态的任务，当前状态: ${lockedTask.status}`)
    }

    await tx
      .update(tasks)
      .set({
        status: TaskStatus.CANCELLED,
        completedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))

    return lockedTask
  })

  // 记录日志
  await logTaskCancelled(taskId)

  // 退款
  await refundTask(task)
}

export const taskService = {
  create,
  cancel,
}
