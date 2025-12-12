/**
 * 工作流执行上下文
 * 提供节点执行所需的环境和工具方法
 */

import { eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import type { NodeState } from '@/db/schema'
import { tasks, workflowTasks } from '@/db/schema'
import { taskService } from '@/lib/tasks/service'
import type { CreateTaskParams, Task } from '@/lib/tasks/types'

import type { NodeStateOutput } from '../types'

import { resolveVariablePath } from './expression'
import type { GraphEdge, GraphNode } from './graph'
import { WorkflowGraph } from './graph'

/** 工作流任务数据库记录类型 */
export type WorkflowTaskRecord = typeof workflowTasks.$inferSelect

/** 工作流定义数据库记录类型 */
export interface WorkflowRecord {
  id: number
  accountId: number
  name: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  variables?: Record<string, { type: string; defaultValue?: unknown }>
}

/**
 * 工作流执行上下文
 */
export class ExecutionContext {
  public readonly graph: WorkflowGraph

  constructor(
    public readonly workflowTask: WorkflowTaskRecord,
    public readonly workflow: WorkflowRecord,
    public readonly node: GraphNode
  ) {
    this.graph = new WorkflowGraph(workflow.nodes, workflow.edges)
  }

  /**
   * 获取当前节点状态
   */
  getNodeState(): NodeState | undefined {
    return this.workflowTask.nodeStates[this.node.id]
  }

  /**
   * 解析变量路径
   *
   * @param path 变量路径，如 "$var.inputImage" 或 "$node.step1.output.url"
   * @returns 解析后的值
   */
  resolveVariable(path: string): unknown {
    return resolveVariablePath(path, {
      variables: this.workflowTask.runtimeVariables ?? {},
      nodeStates: this.workflowTask.nodeStates,
    })
  }

  /**
   * 设置运行时变量（原子操作）
   *
   * 使用 PostgreSQL JSONB || 操作符进行原子合并，避免并发更新时的竞态条件。
   *
   * @param name 变量名
   * @param value 变量值
   */
  async setVariable(name: string, value: unknown): Promise<void> {
    const variableJson = JSON.stringify({ [name]: value })

    await db
      .update(workflowTasks)
      .set({
        runtimeVariables: sql`COALESCE(${workflowTasks.runtimeVariables}, '{}'::jsonb) || ${variableJson}::jsonb`,
      })
      .where(eq(workflowTasks.id, this.workflowTask.id))

    // 更新本地缓存
    const currentVariables = this.workflowTask.runtimeVariables ?? {}
    ;(this.workflowTask.runtimeVariables as Record<string, unknown>) = {
      ...currentVariables,
      [name]: value,
    }
  }

  /**
   * 批量设置运行时变量（原子操作）
   *
   * 使用 PostgreSQL JSONB || 操作符进行原子合并，避免并发更新时的竞态条件。
   *
   * @param variables 变量对象
   */
  async setVariables(variables: Record<string, unknown>): Promise<void> {
    const variablesJson = JSON.stringify(variables)

    await db
      .update(workflowTasks)
      .set({
        runtimeVariables: sql`COALESCE(${workflowTasks.runtimeVariables}, '{}'::jsonb) || ${variablesJson}::jsonb`,
      })
      .where(eq(workflowTasks.id, this.workflowTask.id))

    // 更新本地缓存
    const currentVariables = this.workflowTask.runtimeVariables ?? {}
    ;(this.workflowTask.runtimeVariables as Record<string, unknown>) = {
      ...currentVariables,
      ...variables,
    }
  }

  /**
   * 更新节点状态（原子操作）
   *
   * 使用 PostgreSQL jsonb_set 函数进行原子更新，避免并发更新时的竞态条件。
   * 每个节点只更新自己的状态，不会覆盖其他节点的状态。
   *
   * @param state 部分节点状态
   */
  async updateNodeState(state: Partial<NodeState>): Promise<void> {
    const nodeId = this.node.id
    const stateJson = JSON.stringify(state)

    // 使用 jsonb_set + COALESCE 进行原子更新
    // 1. COALESCE(nodeStates -> nodeId, '{}') 获取当前节点状态，不存在则为空对象
    // 2. || stateJson 将新状态合并到现有状态
    // 3. jsonb_set 将合并后的状态设置回 nodeStates
    await db
      .update(workflowTasks)
      .set({
        nodeStates: sql`jsonb_set(
          ${workflowTasks.nodeStates},
          ARRAY[${nodeId}]::text[],
          COALESCE(${workflowTasks.nodeStates} -> ${nodeId}, '{}'::jsonb) || ${stateJson}::jsonb
        )`,
      })
      .where(eq(workflowTasks.id, this.workflowTask.id))

    // 更新本地缓存（合并而不是覆盖）
    const currentNodeState = this.workflowTask.nodeStates[nodeId] || {}
    ;(this.workflowTask.nodeStates as Record<string, NodeState>)[nodeId] = {
      ...currentNodeState,
      ...state,
    } as NodeState
  }

  /**
   * 获取任务
   *
   * @param taskId 任务 ID
   * @returns 任务记录
   */
  async getTask(taskId: number): Promise<Task | null> {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    })
    return task ?? null
  }

  /**
   * 创建任务（复用现有任务系统）
   *
   * @param params 创建任务参数
   * @returns 创建的任务
   */
  async createTask(params: Omit<CreateTaskParams, 'accountId'>): Promise<Task> {
    const task = await taskService.create({
      ...params,
      accountId: this.workflowTask.accountId,
    })

    // 原子更新工作流任务的预估费用（避免并发竞态条件）
    await db
      .update(workflowTasks)
      .set({
        totalEstimatedCost: sql`${workflowTasks.totalEstimatedCost} + ${task.estimatedCost}`,
      })
      .where(eq(workflowTasks.id, this.workflowTask.id))

    return task
  }

  /**
   * 获取前驱节点的输出
   *
   * @param nodeId 节点 ID（如果不指定，获取第一个前驱节点）
   * @returns 节点输出
   */
  getPredecessorOutput(nodeId?: string): NodeStateOutput | undefined {
    const predecessors = this.graph.getPredecessors(this.node.id)

    if (nodeId) {
      const state = this.workflowTask.nodeStates[nodeId]
      return state?.output
    }

    // 返回第一个完成的前驱节点的输出
    for (const pred of predecessors) {
      const state = this.workflowTask.nodeStates[pred.id]
      if (state?.status === 'completed' && state.output) {
        return state.output
      }
    }

    return undefined
  }

  /**
   * 获取所有前驱节点的输出
   *
   * @returns 节点 ID 到输出的映射
   */
  getAllPredecessorOutputs(): Record<string, NodeStateOutput> {
    const predecessors = this.graph.getPredecessors(this.node.id)
    const outputs: Record<string, NodeStateOutput> = {}

    for (const pred of predecessors) {
      const state = this.workflowTask.nodeStates[pred.id]
      if (state?.output) {
        outputs[pred.id] = state.output
      }
    }

    return outputs
  }
}
