/**
 * 工作流服务
 * 提供工作流和工作流任务的 CRUD 操作
 */

import { and, count, desc, eq, SQL } from 'drizzle-orm'

import { db } from '@/db'
import type {
  WorkflowEdge as SchemaWorkflowEdge,
  WorkflowNode as SchemaWorkflowNode,
  WorkflowVariableDefinition,
} from '@/db/schema'
import { workflowLogs, workflows, workflowTasks } from '@/db/schema'

import type { GraphEdge, GraphNode } from './engine/graph'
import { WorkflowGraph } from './engine/graph'
import type { WorkflowExecMode } from './types'
import { WorkflowStatus } from './types'

// ==================== 工作流定义服务 ====================

/** 创建工作流参数 */
export interface CreateWorkflowParams {
  accountId: number
  name: string
  description?: string
  nodes: SchemaWorkflowNode[]
  edges: SchemaWorkflowEdge[]
  variables?: Record<string, WorkflowVariableDefinition>
}

/** 更新工作流参数 */
export interface UpdateWorkflowParams {
  name?: string
  description?: string
  nodes?: SchemaWorkflowNode[]
  edges?: SchemaWorkflowEdge[]
  variables?: Record<string, WorkflowVariableDefinition>
  isActive?: boolean
}

/**
 * 创建工作流
 */
async function createWorkflow(params: CreateWorkflowParams) {
  const { accountId, name, description, nodes, edges, variables } = params

  // 验证工作流定义
  validateWorkflowDefinition({ nodes, edges, variables })

  const [workflow] = await db
    .insert(workflows)
    .values({
      accountId,
      name,
      description,
      nodes,
      edges,
      variables: variables ?? {},
    })
    .returning()

  return workflow
}

/**
 * 更新工作流
 */
async function updateWorkflow(workflowId: number, params: UpdateWorkflowParams) {
  const { nodes, edges, variables, ...rest } = params

  // 如果更新了节点或边，需要验证
  if (nodes || edges) {
    const existing = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    })
    if (!existing) {
      throw new Error('工作流不存在')
    }

    const definition = {
      nodes: nodes ?? existing.nodes,
      edges: edges ?? existing.edges,
      variables: variables ?? existing.variables ?? undefined,
    }
    validateWorkflowDefinition(definition)
  }

  const updateData: Record<string, unknown> = { ...rest }
  if (nodes) updateData.nodes = nodes
  if (edges) updateData.edges = edges
  if (variables !== undefined) updateData.variables = variables

  // 更新版本号
  updateData.version = db.select({ version: workflows.version }).from(workflows).where(eq(workflows.id, workflowId))

  const [updated] = await db
    .update(workflows)
    .set({
      ...updateData,
      version: (await db.query.workflows.findFirst({ where: eq(workflows.id, workflowId) }))!.version + 1,
    })
    .where(eq(workflows.id, workflowId))
    .returning()

  return updated
}

/**
 * 获取工作流
 */
async function getWorkflow(workflowId: number) {
  return db.query.workflows.findFirst({
    where: eq(workflows.id, workflowId),
  })
}

/**
 * 列出工作流
 */
interface ListWorkflowsOptions {
  isActive?: boolean
  limit?: number
  offset?: number
}

async function listWorkflows(accountId: number, options: ListWorkflowsOptions = {}) {
  const { isActive, limit = 20, offset = 0 } = options

  const conditions: SQL[] = [eq(workflows.accountId, accountId)]
  if (isActive !== undefined) {
    conditions.push(eq(workflows.isActive, isActive))
  }

  const where = conditions.length > 1 ? and(...conditions) : conditions[0]

  const [workflowList, [{ total }]] = await Promise.all([
    db.select().from(workflows).where(where).orderBy(desc(workflows.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(workflows).where(where),
  ])

  return { workflows: workflowList, total }
}

/**
 * 删除工作流
 */
async function deleteWorkflow(workflowId: number) {
  await db.delete(workflows).where(eq(workflows.id, workflowId))
}

/** 工作流定义（用于验证） */
interface WorkflowDefinitionInput {
  nodes: GraphNode[]
  edges: GraphEdge[]
  variables?: Record<string, WorkflowVariableDefinition>
}

/**
 * 验证工作流定义
 */
function validateWorkflowDefinition(definition: WorkflowDefinitionInput): void {
  const { nodes, edges } = definition

  if (!nodes || nodes.length === 0) {
    throw new Error('工作流必须至少包含一个节点')
  }

  // 构建图并检测环路
  const graph = new WorkflowGraph(nodes as GraphNode[], edges as GraphEdge[])
  if (graph.hasCycle()) {
    throw new Error('工作流不能包含环路')
  }

  // 检查边引用的节点是否存在
  const nodeIds = new Set(nodes.map((n) => n.id))
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      throw new Error(`边的源节点不存在: ${edge.source}`)
    }
    if (!nodeIds.has(edge.target)) {
      throw new Error(`边的目标节点不存在: ${edge.target}`)
    }
  }
}

// ==================== 工作流任务服务 ====================

/** 创建工作流任务参数 */
export interface CreateWorkflowTaskParams {
  accountId: number
  workflowId: number
  execMode: WorkflowExecMode
  startNodeIds?: string[]
  runtimeVariables?: Record<string, unknown>
}

/**
 * 创建工作流任务
 */
async function createWorkflowTask(params: CreateWorkflowTaskParams) {
  const { accountId, workflowId, execMode, startNodeIds, runtimeVariables } = params

  // 验证工作流存在且激活
  const workflow = await db.query.workflows.findFirst({
    where: and(eq(workflows.id, workflowId), eq(workflows.accountId, accountId)),
  })

  if (!workflow) {
    throw new Error('工作流不存在')
  }

  if (!workflow.isActive) {
    throw new Error('工作流未激活')
  }

  // 验证起始节点
  if (startNodeIds && startNodeIds.length > 0) {
    const nodeIds = new Set(workflow.nodes.map((n) => n.id))
    for (const nodeId of startNodeIds) {
      if (!nodeIds.has(nodeId)) {
        throw new Error(`起始节点不存在: ${nodeId}`)
      }
    }
  }

  // 合并默认变量和运行时变量
  const workflowVariables = workflow.variables ?? {}
  const mergedVariables: Record<string, unknown> = {}

  // 先设置默认值
  for (const [name, def] of Object.entries(workflowVariables)) {
    if (def.defaultValue !== undefined) {
      mergedVariables[name] = def.defaultValue
    }
  }

  // 再覆盖运行时变量
  if (runtimeVariables) {
    Object.assign(mergedVariables, runtimeVariables)
  }

  const [task] = await db
    .insert(workflowTasks)
    .values({
      accountId,
      workflowId,
      execMode,
      startNodeIds: startNodeIds ?? null,
      status: WorkflowStatus.RUNNING,
      nodeStates: {},
      runtimeVariables: mergedVariables,
      startedAt: new Date(),
    })
    .returning()

  // 记录创建日志
  await db.insert(workflowLogs).values({
    workflowTaskId: task.id,
    level: 'info',
    message: '工作流任务已创建',
    data: { execMode, startNodeIds },
  })

  return task
}

/**
 * 获取工作流任务
 */
async function getWorkflowTask(taskId: number) {
  return db.query.workflowTasks.findFirst({
    where: eq(workflowTasks.id, taskId),
  })
}

/**
 * 获取工作流任务详情（包含日志）
 */
async function getWorkflowTaskDetail(taskId: number) {
  const [task, logs] = await Promise.all([
    db.query.workflowTasks.findFirst({
      where: eq(workflowTasks.id, taskId),
    }),
    db.query.workflowLogs.findMany({
      where: eq(workflowLogs.workflowTaskId, taskId),
      orderBy: desc(workflowLogs.createdAt),
    }),
  ])

  if (!task) {
    return null
  }

  return { task, logs }
}

/**
 * 列出工作流任务
 */
interface ListWorkflowTasksOptions {
  workflowId?: number
  status?: WorkflowStatus
  limit?: number
  offset?: number
}

async function listWorkflowTasks(accountId: number, options: ListWorkflowTasksOptions = {}) {
  const { workflowId, status, limit = 20, offset = 0 } = options

  const conditions: SQL[] = [eq(workflowTasks.accountId, accountId)]
  if (workflowId) {
    conditions.push(eq(workflowTasks.workflowId, workflowId))
  }
  if (status) {
    conditions.push(eq(workflowTasks.status, status))
  }

  const where = conditions.length > 1 ? and(...conditions) : conditions[0]

  const [taskList, [{ total }]] = await Promise.all([
    db.select().from(workflowTasks).where(where).orderBy(desc(workflowTasks.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(workflowTasks).where(where),
  ])

  return { tasks: taskList, total }
}

/**
 * 取消工作流任务
 */
async function cancelWorkflowTask(taskId: number) {
  const task = await db.query.workflowTasks.findFirst({
    where: eq(workflowTasks.id, taskId),
  })

  if (!task) {
    throw new Error('工作流任务不存在')
  }

  if (task.status !== WorkflowStatus.RUNNING) {
    throw new Error(`只能取消运行中的任务，当前状态: ${task.status}`)
  }

  await db
    .update(workflowTasks)
    .set({
      status: WorkflowStatus.FAILED,
      errorMessage: '用户取消',
      completedAt: new Date(),
    })
    .where(eq(workflowTasks.id, taskId))

  await db.insert(workflowLogs).values({
    workflowTaskId: taskId,
    level: 'warn',
    message: '工作流任务已被用户取消',
  })
}

/**
 * 获取工作流任务日志
 */
async function getWorkflowTaskLogs(taskId: number, limit = 100, offset = 0) {
  return db.query.workflowLogs.findMany({
    where: eq(workflowLogs.workflowTaskId, taskId),
    orderBy: desc(workflowLogs.createdAt),
    limit,
    offset,
  })
}

// ==================== 导出服务 ====================

export const workflowService = {
  // 工作流定义
  create: createWorkflow,
  update: updateWorkflow,
  get: getWorkflow,
  list: listWorkflows,
  delete: deleteWorkflow,
  validate: validateWorkflowDefinition,

  // 工作流任务
  createTask: createWorkflowTask,
  getTask: getWorkflowTask,
  getTaskDetail: getWorkflowTaskDetail,
  listTasks: listWorkflowTasks,
  cancelTask: cancelWorkflowTask,
  getTaskLogs: getWorkflowTaskLogs,
}