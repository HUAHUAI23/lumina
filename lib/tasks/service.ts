/**
 * 任务服务
 */

import { and, count, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { taskLogs, taskResources, tasks } from '@/db/schema'
import { getOutputPath, uploadFromUrl } from '@/lib/tos'

import { calculateEstimatedCost, chargeForTask, refundTask } from './billing'
import { TaskNotFoundError } from './errors'
import type {
  CreateTaskParams,
  ListTasksParams,
  TaskOutputResource,
  TaskStatusType,
  TaskUpdateParams,
  TaskWithResources,
} from './types'
import { TASK_TYPE_TO_CATEGORY, TASK_TYPE_TO_MODE, TaskStatus } from './types'

/**
 * 创建任务
 */
async function create(params: CreateTaskParams) {
  const { accountId, name, type, config, inputs, estimatedDuration, estimatedCount } = params

  const category = TASK_TYPE_TO_CATEGORY[type]
  const mode = TASK_TYPE_TO_MODE[type]

  // 计算预估费用
  const { cost, pricingId } = await calculateEstimatedCost(type, estimatedDuration, estimatedCount)

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
        pricingId,
        billingType: 'per_unit',
        estimatedCost: cost,
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
    await tx.insert(taskLogs).values({
      taskId: task.id,
      level: 'info',
      message: '任务创建成功',
      data: { estimatedCost: cost },
    })

    return task
  })
}

/**
 * 获取任务详情
 */
async function get(taskId: number): Promise<TaskWithResources | null> {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  })

  if (!task) return null

  const resources = await db.query.taskResources.findMany({
    where: eq(taskResources.taskId, taskId),
  })

  return {
    task,
    inputs: resources.filter((r) => r.isInput),
    outputs: resources.filter((r) => !r.isInput),
  }
}

/**
 * 获取任务列表
 */
async function list(accountId: number, params: ListTasksParams = {}) {
  const { status, type, limit = 20, offset = 0 } = params

  const conditions = [eq(tasks.accountId, accountId)]

  if (status) {
    conditions.push(eq(tasks.status, status))
  }

  if (type) {
    conditions.push(eq(tasks.type, type))
  }

  const where = and(...conditions)

  const [taskList, [{ total }]] = await Promise.all([
    db.query.tasks.findMany({
      where,
      orderBy: [desc(tasks.createdAt)],
      limit,
      offset,
    }),
    db.select({ total: count() }).from(tasks).where(where),
  ])

  return { tasks: taskList, total }
}

/**
 * 取消任务
 */
async function cancel(taskId: number): Promise<void> {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  })

  if (!task) {
    throw new TaskNotFoundError(taskId)
  }

  if (task.status !== TaskStatus.PENDING) {
    throw new Error(`只能取消待处理状态的任务，当前状态: ${task.status}`)
  }

  await db.transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({
        status: TaskStatus.CANCELLED,
        completedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))

    await tx.insert(taskLogs).values({
      taskId,
      level: 'info',
      message: '任务已取消',
    })
  })

  // 退款
  await refundTask(task)
}

/**
 * 更新任务状态
 */
async function updateStatus(
  taskId: number,
  status: TaskStatusType,
  extra?: TaskUpdateParams
): Promise<void> {
  await db
    .update(tasks)
    .set({ status, ...extra })
    .where(eq(tasks.id, taskId))
}

/**
 * 记录任务日志
 */
async function log(
  taskId: number,
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  await db.insert(taskLogs).values({ taskId, level, message, data })
}

/**
 * 添加输出资源（下载外部URL并上传到TOS）
 */
async function addOutputResource(
  taskId: number,
  accountId: number,
  taskType: string,
  outputs: TaskOutputResource[]
): Promise<TaskOutputResource[]> {
  if (outputs.length === 0) return []

  // 下载并上传到 TOS
  const uploadedOutputs: TaskOutputResource[] = []

  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i]
    const filename = `output_${i}_${Date.now()}.${output.type === 'video' ? 'mp4' : 'jpg'}`
    const tosKey = getOutputPath(accountId.toString(), taskType, taskId.toString(), filename)

    // 从外部 URL 下载并上传到 TOS
    const tosUrl = await uploadFromUrl(tosKey, output.url)

    uploadedOutputs.push({
      type: output.type,
      url: tosUrl,
      metadata: output.metadata,
    })
  }

  // 保存到数据库
  await db.insert(taskResources).values(
    uploadedOutputs.map((output) => ({
      taskId,
      resourceType: output.type,
      isInput: false,
      url: output.url,
      metadata: output.metadata || {},
    }))
  )

  return uploadedOutputs
}

export const taskService = {
  create,
  get,
  list,
  cancel,
  updateStatus,
  log,
  addOutputResource,
}