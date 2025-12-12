/**
 * 任务节点 Handler 实现
 * 复用现有 Task 系统
 */

import { logger as baseLogger } from '@/lib/logger'
import type { TaskConfig, TaskInputResource, TaskTypeType } from '@/lib/tasks/types'
import { TaskStatus } from '@/lib/tasks/types'

import type { ExecutionContext } from '../engine/context'
import type { HandlerResult, NodeStateOutput, TaskNode, TaskNodeInput } from '../types'
import { NODE_TYPE_TO_TASK_TYPE, NodeType, Signal } from '../types'

import { BaseNodeHandler } from './base'

const logger = baseLogger.child({ module: 'workflows/handlers/task' })

/**
 * 通用任务节点 Handler
 * 支持所有任务类型
 */
export class TaskNodeHandler extends BaseNodeHandler {
  readonly nodeType: NodeType

  constructor(nodeType: NodeType) {
    super()
    this.nodeType = nodeType
  }

  async execute(context: ExecutionContext): Promise<HandlerResult> {
    const node = context.node as unknown as TaskNode
    const nodeState = context.getNodeState()

    logger.info(
      {
        workflowTaskId: context.workflowTask.id,
        nodeId: node.id,
        nodeType: node.type,
        hasTaskId: !!nodeState?.taskId,
      },
      '执行任务节点'
    )

    // 1. 检查是否已有关联任务
    if (nodeState?.taskId) {
      return this.checkTaskStatus(context, nodeState.taskId)
    }

    // 2. 创建新任务
    return this.createAndSubmitTask(context, node)
  }

  /**
   * 检查任务状态
   */
  private async checkTaskStatus(context: ExecutionContext, taskId: number): Promise<HandlerResult> {
    const task = await context.getTask(taskId)

    if (!task) {
      logger.error({ taskId }, '关联任务不存在')
      return { signal: Signal.FAIL, error: '关联任务不存在' }
    }

    logger.info(
      {
        workflowTaskId: context.workflowTask.id,
        nodeId: context.node.id,
        taskId,
        taskStatus: task.status,
      },
      '检查任务状态'
    )

    switch (task.status) {
      case TaskStatus.COMPLETED:
        // 任务完成，提取输出
        return this.handleTaskCompleted(context, task)

      case TaskStatus.FAILED:
      case TaskStatus.CANCELLED:
        return {
          signal: Signal.FAIL,
          error: `任务${task.status === TaskStatus.FAILED ? '失败' : '已取消'}`,
        }

      case TaskStatus.PENDING:
      case TaskStatus.PROCESSING:
        // 任务仍在执行，等待下次 reconcile
        return { signal: Signal.SUSPEND }

      case TaskStatus.PARTIAL:
        // 部分完成，目前当作完成处理
        return this.handleTaskCompleted(context, task)

      default:
        return { signal: Signal.SUSPEND }
    }
  }

  /**
   * 处理任务完成
   */
  private async handleTaskCompleted(
    context: ExecutionContext,
    task: { result?: unknown; actualCost?: number | null }
  ): Promise<HandlerResult> {
    const output: NodeStateOutput = {
      resources: [],
      variables: {},
    }

    // 提取任务结果
    if (task.result && Array.isArray(task.result)) {
      for (const result of task.result) {
        if (result && typeof result === 'object' && 'url' in result) {
          output.resources!.push({
            type: 'video', // 默认为 video，可以根据任务类型调整
            url: String(result.url),
            metadata: result as Record<string, unknown>,
          })
        }
      }
    }

    // 记录实际费用
    if (task.actualCost !== undefined && task.actualCost !== null) {
      output.variables!.actualCost = task.actualCost
    }

    logger.info(
      {
        workflowTaskId: context.workflowTask.id,
        nodeId: context.node.id,
        resourceCount: output.resources?.length ?? 0,
      },
      '任务完成，提取输出'
    )

    return { signal: Signal.CONTINUE, output }
  }

  /**
   * 创建并提交任务
   */
  private async createAndSubmitTask(
    context: ExecutionContext,
    node: TaskNode
  ): Promise<HandlerResult> {
    const config = node.config
    const taskType = NODE_TYPE_TO_TASK_TYPE[node.type] as TaskTypeType | undefined

    if (!taskType) {
      return { signal: Signal.FAIL, error: `未知的任务类型: ${node.type}` }
    }

    try {
      // 解析输入
      const inputs = this.resolveInputs(config.inputs, context)

      // 构建任务配置
      const taskConfig = this.buildTaskConfig(taskType, config.taskConfig, context)

      logger.info(
        {
          workflowTaskId: context.workflowTask.id,
          nodeId: node.id,
          taskType,
          inputCount: inputs.length,
        },
        '创建任务'
      )

      // 创建任务
      const task = await context.createTask({
        name: node.name || `工作流节点任务-${node.id}`,
        type: taskType,
        config: taskConfig,
        inputs,
        estimatedDuration: taskConfig.duration as number | undefined,
      })

      // 保存任务 ID 到节点状态
      await context.updateNodeState({
        taskId: task.id,
      })

      logger.info(
        {
          workflowTaskId: context.workflowTask.id,
          nodeId: node.id,
          taskId: task.id,
        },
        '任务创建成功'
      )

      // 返回 SUSPEND，等待任务执行完成
      return { signal: Signal.SUSPEND }
    } catch (error) {
      const err = error as Error
      logger.error(
        {
          workflowTaskId: context.workflowTask.id,
          nodeId: node.id,
          error: err.message,
        },
        '创建任务失败'
      )
      return { signal: Signal.FAIL, error: `创建任务失败: ${err.message}` }
    }
  }

  /**
   * 解析输入配置
   */
  private resolveInputs(
    inputConfigs: TaskNodeInput[],
    context: ExecutionContext
  ): TaskInputResource[] {
    const inputs: TaskInputResource[] = []

    for (const inputConfig of inputConfigs) {
      const value = context.resolveVariable(inputConfig.source)

      if (value === undefined || value === null) {
        logger.warn(
          {
            inputName: inputConfig.name,
            source: inputConfig.source,
          },
          '输入值未找到'
        )
        continue
      }

      // 根据输入名推断资源类型
      const resourceType = this.inferResourceType(inputConfig.name)

      inputs.push({
        type: resourceType,
        url: String(value),
      })
    }

    return inputs
  }

  /**
   * 根据输入名推断资源类型
   */
  private inferResourceType(inputName: string): 'video' | 'image' | 'audio' | 'text' {
    const lowerName = inputName.toLowerCase()

    if (lowerName.includes('video')) return 'video'
    if (lowerName.includes('image') || lowerName.includes('img') || lowerName.includes('photo'))
      return 'image'
    if (lowerName.includes('audio') || lowerName.includes('sound') || lowerName.includes('voice'))
      return 'audio'

    // 默认为 image
    return 'image'
  }

  /**
   * 构建任务配置
   */
  private buildTaskConfig(
    taskType: TaskTypeType,
    nodeTaskConfig: Record<string, unknown>,
    context: ExecutionContext
  ): TaskConfig {
    // 解析配置中的变量引用
    const resolvedConfig: Record<string, unknown> = { taskType }

    for (const [key, value] of Object.entries(nodeTaskConfig)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        resolvedConfig[key] = context.resolveVariable(value)
      } else {
        resolvedConfig[key] = value
      }
    }

    return resolvedConfig as TaskConfig
  }
}

// ==================== 具体任务节点 Handler ====================

/**
 * 视频动作模仿节点 Handler
 */
export class VideoMotionNodeHandler extends TaskNodeHandler {
  constructor() {
    super(NodeType.VIDEO_MOTION)
  }
}

/**
 * 视频改口型节点 Handler
 */
export class VideoLipsyncNodeHandler extends TaskNodeHandler {
  constructor() {
    super(NodeType.VIDEO_LIPSYNC)
  }
}

/**
 * 音频 TTS 节点 Handler
 */
export class AudioTTSNodeHandler extends TaskNodeHandler {
  constructor() {
    super(NodeType.AUDIO_TTS)
  }
}
