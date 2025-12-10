/**
 * 任务服务
 */

import { and, count, desc, eq, SQL } from 'drizzle-orm'

import { db } from '@/db'
import { taskResources, tasks } from '@/db/schema'

import { logTaskCancelled, logTaskCreated } from './utils/task-logger'
import {
  calculateAudioEstimatedCost,
  calculateImageEstimatedCost,
  calculateVideoEstimatedCost,
  chargeForTask,
  refundTask,
} from './billing'
import { TaskNotFoundError } from './errors'
import type { CreateTaskParams, Task, TaskStatusType, TaskTypeType } from './types'
import { TASK_TYPE_TO_CATEGORY, TASK_TYPE_TO_MODE, TaskCategory, TaskStatus } from './types'

/**
 * 创建任务 (预扣费)
 */
async function create(params: CreateTaskParams) {
  const { accountId, name, type, config, inputs, estimatedDuration, estimatedCount } = params

  const category = TASK_TYPE_TO_CATEGORY[type]
  const mode = TASK_TYPE_TO_MODE[type]

  // 计算预估费用和用量
  let cost
  let estimatedUsage
  let pricing

  switch (category) {
    case TaskCategory.VIDEO:
      ;({ cost, estimatedUsage, pricing } = await calculateVideoEstimatedCost(
        type,
        estimatedDuration,
        estimatedCount
      ))
      break
    case TaskCategory.IMAGE:
      ;({ cost, estimatedUsage, pricing } = await calculateImageEstimatedCost(type, estimatedCount))
      break
    case TaskCategory.AUDIO:
      ;({ cost, estimatedUsage, pricing } = await calculateAudioEstimatedCost(
        type,
        estimatedDuration,
        estimatedCount
      ))
      break
    default:
      throw new Error(`不支持的任务类别: ${category}`)
  }

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

    // 记录日志（传递事务上下文）
    await logTaskCreated(task.id, cost, tx)

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
    const [lockedTask] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).for('update')

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

/**
 * 查询任务列表
 */
interface ListTasksOptions {
  status?: TaskStatusType
  type?: TaskTypeType
  limit?: number
  offset?: number
}

interface ListTasksResult {
  tasks: Task[]
  total: number
}

async function list(accountId: number, options: ListTasksOptions = {}): Promise<ListTasksResult> {
  const { status, type, limit = 20, offset = 0 } = options

  // 构建查询条件
  const conditions: SQL[] = [eq(tasks.accountId, accountId)]

  if (status) {
    conditions.push(eq(tasks.status, status))
  }

  if (type) {
    conditions.push(eq(tasks.type, type))
  }

  const where = conditions.length > 1 ? and(...conditions) : conditions[0]

  // 查询任务列表
  const taskList = await db
    .select()
    .from(tasks)
    .where(where)
    .orderBy(desc(tasks.createdAt))
    .limit(limit)
    .offset(offset)

  // 查询总数
  const [{ total }] = await db.select({ total: count() }).from(tasks).where(where)

  return {
    tasks: taskList,
    total,
  }
}

/**
 * 获取任务详情（包括输入输出资源）
 */
async function get(taskId: number) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  })

  if (!task) {
    return null
  }

  // 获取输入资源
  const inputs = await db.query.taskResources.findMany({
    where: and(eq(taskResources.taskId, taskId), eq(taskResources.isInput, true)),
  })

  // 获取输出资源
  const outputs = await db.query.taskResources.findMany({
    where: and(eq(taskResources.taskId, taskId), eq(taskResources.isInput, false)),
  })

  return {
    task,
    inputs,
    outputs,
  }
}

export const taskService = {
  create,
  cancel,
  list,
  get,
}
