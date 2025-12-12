/**
 * 工作流执行器
 * 核心职责：遍历图结构，调用节点 Handler，管理执行状态
 */

import { eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { workflowLogs, workflows, workflowTasks } from '@/db/schema'
import { logger as baseLogger } from '@/lib/logger'

import { nodeHandlerRegistry } from '../handlers/registry'
import type { NodeState } from '../types'
import { NodeStatus, NodeType, Signal, WorkflowStatus } from '../types'

import { ExecutionContext, type WorkflowRecord, type WorkflowTaskRecord } from './context'
import { evaluateCondition } from './expression'
import type { GraphNode } from './graph'
import { WorkflowGraph } from './graph'

const logger = baseLogger.child({ module: 'workflows/executor' })

/** 节点执行结果 */
interface NodeExecutionResult {
  nodeId: string
  signal: Signal
  error?: string
}

/**
 * 工作流执行器
 */
export class WorkflowExecutor {
  /**
   * 执行一轮 reconcile
   *
   * @param workflowTask 工作流任务记录
   * @returns 是否还有待执行的工作（true 表示下次还需要 reconcile）
   */
  async reconcile(workflowTask: WorkflowTaskRecord): Promise<boolean> {
    logger.info(
      {
        workflowTaskId: workflowTask.id,
        status: workflowTask.status,
        execMode: workflowTask.execMode,
      },
      '开始 reconcile 工作流任务'
    )

    // 1. 获取工作流定义
    const workflow = await this.getWorkflow(workflowTask.workflowId)
    if (!workflow) {
      logger.error({ workflowId: workflowTask.workflowId }, '工作流定义不存在')
      await this.markWorkflowFailed(workflowTask.id, undefined, '工作流定义不存在')
      return false
    }

    const graph = new WorkflowGraph(workflow.nodes, workflow.edges)

    // 2. 获取可执行的节点
    const executableNodes = await this.getExecutableNodes(workflowTask, graph)

    logger.info(
      {
        workflowTaskId: workflowTask.id,
        executableCount: executableNodes.length,
        executableNodeIds: executableNodes.map((n) => n.id),
      },
      '获取可执行节点'
    )

    // 3. 检查是否全部完成
    if (executableNodes.length === 0) {
      if (this.isAllCompleted(workflowTask, graph)) {
        await this.markWorkflowCompleted(workflowTask.id)
        logger.info({ workflowTaskId: workflowTask.id }, '工作流任务执行完成')
        return false
      }

      // 有节点在等待（异步任务），继续等待
      logger.info({ workflowTaskId: workflowTask.id }, '有节点在等待，继续 reconcile')
      return true
    }

    // 4. 执行可执行节点
    const results = await Promise.all(
      executableNodes.map((node) => this.executeNode(workflowTask, workflow, node))
    )

    // 5. 处理执行结果
    for (const result of results) {
      if (result.signal === Signal.FAIL) {
        await this.markWorkflowFailed(workflowTask.id, result.nodeId, result.error)
        logger.error(
          {
            workflowTaskId: workflowTask.id,
            nodeId: result.nodeId,
            error: result.error,
          },
          '工作流任务执行失败'
        )
        return false
      }
    }

    // 6. 检查是否有 SUSPEND 信号
    const hasSuspend = results.some((r) => r.signal === Signal.SUSPEND)
    const hasContinue = results.some((r) => r.signal === Signal.CONTINUE)

    if (hasContinue) {
      // 有节点完成，继续执行
      logger.info({ workflowTaskId: workflowTask.id }, '有节点完成，继续执行')
      return true
    }

    if (hasSuspend) {
      // 所有节点都在等待
      logger.info({ workflowTaskId: workflowTask.id }, '所有节点都在等待')
      return true
    }

    // 默认继续
    return true
  }

  /**
   * 获取工作流定义
   */
  private async getWorkflow(workflowId: number): Promise<WorkflowRecord | null> {
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    })
    return workflow as WorkflowRecord | null
  }

  /**
   * 获取可执行的节点
   */
  private async getExecutableNodes(
    workflowTask: WorkflowTaskRecord,
    graph: WorkflowGraph
  ): Promise<GraphNode[]> {
    const { nodeStates, startNodeIds, execMode } = workflowTask

    // 获取起始节点
    const startNodes = graph.getExecutionStartNodes(
      execMode as 'all' | 'specified_starts' | 'isolated_nodes',
      startNodeIds ?? undefined
    )

    const executable: GraphNode[] = []
    const visited = new Set<string>()
    const queue = [...startNodes]

    while (queue.length > 0) {
      const node = queue.shift()!
      if (visited.has(node.id)) continue
      visited.add(node.id)

      const state = nodeStates[node.id]

      // 已完成或跳过的节点，检查后续节点
      if (state?.status === NodeStatus.COMPLETED || state?.status === NodeStatus.SKIPPED) {
        const outEdges = graph.getOutEdges(node.id)
        for (const edge of outEdges) {
          // 检查条件边
          if (graph.isConditionEdge(edge)) {
            const conditionMet = evaluateCondition(edge.condition!, {
              variables: workflowTask.runtimeVariables ?? {},
              nodeStates,
            })
            if (!conditionMet) {
              // 条件不满足，标记目标节点为跳过
              await this.markNodeSkipped(workflowTask.id, edge.target, nodeStates)
              continue
            }
          }

          const targetNode = graph.getNode(edge.target)
          if (targetNode && !visited.has(targetNode.id)) {
            queue.push(targetNode)
          }
        }
        continue
      }

      // RUNNING 状态的节点，需要检查
      if (state?.status === NodeStatus.RUNNING) {
        executable.push(node)
        continue
      }

      // FAILED 状态的节点，跳过
      if (state?.status === NodeStatus.FAILED) {
        continue
      }

      // PENDING 或无状态，检查前置依赖
      const predecessors = graph.getPredecessors(node.id)
      const allPredecessorsDone = predecessors.every((pred) => {
        const predState = nodeStates[pred.id]
        return (
          predState?.status === NodeStatus.COMPLETED || predState?.status === NodeStatus.SKIPPED
        )
      })

      if (allPredecessorsDone || predecessors.length === 0) {
        executable.push(node)
      }
    }

    return executable
  }

  /**
   * 标记节点为跳过（原子操作）
   */
  private async markNodeSkipped(
    workflowTaskId: number,
    nodeId: string,
    currentStates: Record<string, NodeState>
  ): Promise<void> {
    // 如果节点已经有状态，不重复标记
    if (currentStates[nodeId]) return

    const stateJson = JSON.stringify({
      status: NodeStatus.SKIPPED,
      completedAt: new Date().toISOString(),
    })

    // 使用 jsonb_set 进行原子更新
    await db
      .update(workflowTasks)
      .set({
        nodeStates: sql`jsonb_set(
          ${workflowTasks.nodeStates},
          ARRAY[${nodeId}]::text[],
          ${stateJson}::jsonb
        )`,
      })
      .where(eq(workflowTasks.id, workflowTaskId))
  }

  /**
   * 执行单个节点
   */
  private async executeNode(
    workflowTask: WorkflowTaskRecord,
    workflow: WorkflowRecord,
    node: GraphNode
  ): Promise<NodeExecutionResult> {
    const handler = nodeHandlerRegistry.get(node.type as NodeType)

    if (!handler) {
      logger.error({ nodeType: node.type }, '未找到节点 Handler')
      return {
        nodeId: node.id,
        signal: Signal.FAIL,
        error: `未找到节点处理器: ${node.type}`,
      }
    }

    // 刷新工作流任务数据（防止并发问题），带重试机制
    let freshWorkflowTask: WorkflowTaskRecord | undefined
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        freshWorkflowTask = await db.query.workflowTasks.findFirst({
          where: eq(workflowTasks.id, workflowTask.id),
        })
        break
      } catch (error) {
        if (attempt === 2) {
          logger.error(
            {
              workflowTaskId: workflowTask.id,
              nodeId: node.id,
              error: (error as Error).message,
              attempt,
            },
            '获取工作流任务失败，已重试 3 次'
          )
          return {
            nodeId: node.id,
            signal: Signal.SUSPEND, // 返回 SUSPEND 而不是 FAIL，让下次 reconcile 重试
            error: '获取工作流任务失败，等待重试',
          }
        }
        // 短暂等待后重试
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)))
      }
    }

    if (!freshWorkflowTask) {
      return {
        nodeId: node.id,
        signal: Signal.FAIL,
        error: '工作流任务不存在',
      }
    }

    // 创建执行上下文
    const context = new ExecutionContext(freshWorkflowTask, workflow, node)

    // 标记节点为 RUNNING（如果尚未标记）
    const currentState = freshWorkflowTask.nodeStates[node.id]
    if (!currentState || currentState.status === NodeStatus.PENDING) {
      await context.updateNodeState({
        status: NodeStatus.RUNNING,
        startedAt: new Date().toISOString(),
      })
    }

    try {
      logger.info(
        {
          workflowTaskId: workflowTask.id,
          nodeId: node.id,
          nodeType: node.type,
        },
        '执行节点'
      )

      const result = await handler.execute(context)

      logger.info(
        {
          workflowTaskId: workflowTask.id,
          nodeId: node.id,
          signal: result.signal,
        },
        '节点执行完成'
      )

      // 根据信号更新状态
      if (result.signal === Signal.CONTINUE) {
        await context.updateNodeState({
          status: NodeStatus.COMPLETED,
          output: result.output,
          completedAt: new Date().toISOString(),
        })

        // 记录日志
        await this.logNodeCompleted(workflowTask.id, node.id, node.name)
      } else if (result.signal === Signal.FAIL) {
        await context.updateNodeState({
          status: NodeStatus.FAILED,
          error: result.error,
          completedAt: new Date().toISOString(),
        })

        // 记录错误日志
        await this.logNodeFailed(workflowTask.id, node.id, node.name, result.error)
      }
      // SUSPEND 状态保持 RUNNING，不更新

      return {
        nodeId: node.id,
        signal: result.signal,
        error: result.error,
      }
    } catch (error) {
      const err = error as Error
      logger.error(
        {
          workflowTaskId: workflowTask.id,
          nodeId: node.id,
          error: err.message,
          stack: err.stack,
        },
        '节点执行异常'
      )

      await context.updateNodeState({
        status: NodeStatus.FAILED,
        error: err.message,
        completedAt: new Date().toISOString(),
      })

      await this.logNodeFailed(workflowTask.id, node.id, node.name, err.message)

      return {
        nodeId: node.id,
        signal: Signal.FAIL,
        error: err.message,
      }
    }
  }

  /**
   * 检查是否所有节点都已完成
   */
  private isAllCompleted(workflowTask: WorkflowTaskRecord, graph: WorkflowGraph): boolean {
    const { nodeStates, startNodeIds, execMode } = workflowTask

    // 获取需要执行的起始节点
    const startNodes = graph.getExecutionStartNodes(
      execMode as 'all' | 'specified_starts' | 'isolated_nodes',
      startNodeIds ?? undefined
    )

    // 获取从起始节点可达的所有节点
    const reachable = graph.getReachableNodes(startNodes.map((n) => n.id))

    // 检查所有可达节点是否都已完成或跳过
    for (const nodeId of reachable) {
      const state = nodeStates[nodeId]
      if (!state) return false
      if (state.status !== NodeStatus.COMPLETED && state.status !== NodeStatus.SKIPPED) {
        return false
      }
    }

    return true
  }

  /**
   * 标记工作流任务为完成
   */
  private async markWorkflowCompleted(workflowTaskId: number): Promise<void> {
    await db
      .update(workflowTasks)
      .set({
        status: WorkflowStatus.COMPLETED,
        completedAt: new Date(),
      })
      .where(eq(workflowTasks.id, workflowTaskId))

    await this.logWorkflowCompleted(workflowTaskId)
  }

  /**
   * 标记工作流任务为失败
   */
  private async markWorkflowFailed(
    workflowTaskId: number,
    errorNodeId: string | undefined,
    errorMessage: string | undefined
  ): Promise<void> {
    await db
      .update(workflowTasks)
      .set({
        status: WorkflowStatus.FAILED,
        errorNodeId: errorNodeId ?? null,
        errorMessage: errorMessage ?? null,
        completedAt: new Date(),
      })
      .where(eq(workflowTasks.id, workflowTaskId))

    await this.logWorkflowFailed(workflowTaskId, errorNodeId, errorMessage)
  }

  // ==================== 日志记录 ====================

  private async logNodeCompleted(
    workflowTaskId: number,
    nodeId: string,
    nodeName: string
  ): Promise<void> {
    await db.insert(workflowLogs).values({
      workflowTaskId,
      level: 'info',
      nodeId,
      message: `节点 "${nodeName}" 执行完成`,
    })
  }

  private async logNodeFailed(
    workflowTaskId: number,
    nodeId: string,
    nodeName: string,
    error: string | undefined
  ): Promise<void> {
    await db.insert(workflowLogs).values({
      workflowTaskId,
      level: 'error',
      nodeId,
      message: `节点 "${nodeName}" 执行失败: ${error || '未知错误'}`,
      data: { error },
    })
  }

  private async logWorkflowCompleted(workflowTaskId: number): Promise<void> {
    await db.insert(workflowLogs).values({
      workflowTaskId,
      level: 'info',
      message: '工作流任务执行完成',
    })
  }

  private async logWorkflowFailed(
    workflowTaskId: number,
    errorNodeId: string | undefined,
    errorMessage: string | undefined
  ): Promise<void> {
    await db.insert(workflowLogs).values({
      workflowTaskId,
      level: 'error',
      message: `工作流任务执行失败`,
      data: { errorNodeId, errorMessage },
    })
  }
}

// 导出单例
export const workflowExecutor = new WorkflowExecutor()
