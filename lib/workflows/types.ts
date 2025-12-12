/**
 * 工作流系统类型定义
 */

import type { ResourceMetadata } from '@/db/schema'

// ==================== 枚举 ====================

/** 节点类型 */
export enum NodeType {
  START = 'start',
  END = 'end',
  VIDEO_MOTION = 'video_motion',
  VIDEO_LIPSYNC = 'video_lipsync',
  AUDIO_TTS = 'audio_tts',
  VARIABLE_SET = 'variable_set',
  CONDITION = 'condition',
  DELAY = 'delay',
}

/** 边类型 */
export enum WorkflowEdgeType {
  NORMAL = 'normal',
  CONDITION = 'condition',
}

/** 节点执行状态 */
export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export const NodeStatus = {
  PENDING: 'pending' as const,
  RUNNING: 'running' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
  SKIPPED: 'skipped' as const,
}

/** 工作流执行模式 */
export enum WorkflowExecMode {
  /** 执行所有起点（包括孤立节点） */
  ALL = 'all',
  /** 指定起点执行 */
  SPECIFIED_STARTS = 'specified_starts',
  /** 仅执行孤立节点 */
  ISOLATED_NODES = 'isolated_nodes',
}

/** 工作流状态 */
export enum WorkflowStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/** Handler 执行结果信号 */
export enum Signal {
  /** 继续执行下一个节点 */
  CONTINUE = 'continue',
  /** 暂停，等待下次 reconcile */
  SUSPEND = 'suspend',
  /** 失败，终止工作流 */
  FAIL = 'fail',
}

// ==================== Handle ====================

/** 节点连接点 */
export interface Handle {
  id: string
  position: 'top' | 'right' | 'bottom' | 'left'
  type: 'source' | 'target'
  /** 仅用于前端 React Flow 展示与编辑，实际路由逻辑读取 WorkflowEdge.condition */
  condition?: string
}

// ==================== Edge ====================

/** 工作流边 */
export interface WorkflowEdge {
  id: string
  type: WorkflowEdgeType
  source: string
  target: string
  condition?: string
  source_handle?: string
  target_handle?: string
}

// ==================== 基础节点 ====================

/** 基础节点接口 */
export interface BaseNode {
  id: string
  type: NodeType
  name: string
  position?: { x: number; y: number }
  handles?: Handle[]
  description?: string
  execMode: 'sync' | 'async'
}

// ==================== 控制节点 ====================

/** 变量定义 */
export interface VariableDefinition {
  name: string
  type: 'string' | 'number' | 'boolean' | 'url'
  required?: boolean
  defaultValue?: unknown
  description?: string
}

/** 起始节点 */
export interface StartNode extends BaseNode {
  type: NodeType.START
  execMode: 'sync'
  config: {
    inputVariables?: VariableDefinition[]
  }
}

/** 终止节点 */
export interface EndNode extends BaseNode {
  type: NodeType.END
  execMode: 'sync'
  config: {
    outputVariables?: Array<{
      name: string
      source: string
    }>
  }
}

/** 变量设置节点 */
export interface VariableSetNode extends BaseNode {
  type: NodeType.VARIABLE_SET
  execMode: 'sync'
  config: {
    variables: Array<{
      name: string
      value: string
    }>
  }
}

/** 条件分支节点 */
export interface ConditionNode extends BaseNode {
  type: NodeType.CONDITION
  execMode: 'sync'
  config: Record<string, never>
}

/** 延时节点 */
export interface DelayNode extends BaseNode {
  type: NodeType.DELAY
  execMode: 'sync'
  config: {
    delaySeconds: number
  }
}

// ==================== 任务节点 ====================

/** 任务节点输入配置 */
export interface TaskNodeInput {
  /** 输入名，如 "imageUrl", "videoUrl" */
  name: string
  /** 来源，如 "$var.inputImage" 或 "$node.step1.output.url" */
  source: string
}

/** 任务节点基础配置 */
export interface TaskNodeConfig {
  inputs: TaskNodeInput[]
  taskConfig: Record<string, unknown>
}

/** 任务节点基类 */
interface TaskNodeBase extends BaseNode {
  config: TaskNodeConfig
}

/** 视频动作模仿节点 */
export interface VideoMotionNode extends TaskNodeBase {
  type: NodeType.VIDEO_MOTION
  execMode: 'async'
  config: TaskNodeConfig & {
    taskConfig: {
      duration: number
      aigcMeta?: {
        contentProducer?: string
        producerId: string
        contentPropagator: string
        propagateId?: string
      }
    }
  }
}

/** 视频改口型节点 */
export interface VideoLipsyncNode extends TaskNodeBase {
  type: NodeType.VIDEO_LIPSYNC
  execMode: 'async'
  config: TaskNodeConfig & {
    taskConfig: {
      duration: number
      useBasicMode?: boolean
      separateVocal?: boolean
      openScenedet?: boolean
      alignAudio?: boolean
      alignAudioReverse?: boolean
      templStartSeconds?: number
    }
  }
}

/** 音频 TTS 节点 */
export interface AudioTTSNode extends TaskNodeBase {
  type: NodeType.AUDIO_TTS
  execMode: 'sync'
  config: TaskNodeConfig & {
    taskConfig: {
      text: string
      referenceAudio: string
      duration: number
    }
  }
}

/** 任务节点联合类型 */
export type TaskNode = VideoMotionNode | VideoLipsyncNode | AudioTTSNode

// ==================== 联合类型 ====================

/** 工作流节点联合类型 */
export type WorkflowNode =
  | StartNode
  | EndNode
  | VariableSetNode
  | ConditionNode
  | DelayNode
  | TaskNode

// ==================== 节点状态 ====================

/** 节点输出资源 */
export interface NodeOutputResource {
  type: 'video' | 'image' | 'audio' | 'text'
  url: string
  metadata?: ResourceMetadata
}

/** 节点输出 */
export interface NodeStateOutput {
  /** 输出资源列表 */
  resources?: NodeOutputResource[]
  /** 输出变量 */
  variables?: Record<string, unknown>
}

/** 节点执行状态 */
export interface NodeState {
  status: NodeStatus
  /** 关联的任务 ID（任务节点用） */
  taskId?: number
  /** 节点输出 */
  output?: NodeStateOutput
  /** 错误信息 */
  error?: string
  startedAt?: string
  completedAt?: string
}

// ==================== 工作流定义 ====================

/** 工作流变量定义 */
export interface WorkflowVariableDefinition {
  type: 'string' | 'number' | 'boolean' | 'url'
  defaultValue?: unknown
  description?: string
}

/** 工作流定义 */
export interface WorkflowDefinition {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  variables?: Record<string, WorkflowVariableDefinition>
}

// ==================== Handler 相关 ====================

/** Handler 执行结果 */
export interface HandlerResult {
  signal: Signal
  output?: NodeStateOutput
  error?: string
}

// ==================== 任务节点类型映射 ====================

/** 节点类型到任务类型的映射 */
export const NODE_TYPE_TO_TASK_TYPE: Partial<Record<NodeType, string>> = {
  [NodeType.VIDEO_MOTION]: 'video_motion',
  [NodeType.VIDEO_LIPSYNC]: 'video_lipsync',
  [NodeType.AUDIO_TTS]: 'audio_tts',
}

/** 判断是否为任务节点 */
export function isTaskNode(node: WorkflowNode): node is TaskNode {
  return node.type in NODE_TYPE_TO_TASK_TYPE
}

/** 判断是否为控制节点 */
export function isControlNode(
  node: WorkflowNode
): node is StartNode | EndNode | VariableSetNode | ConditionNode | DelayNode {
  return !isTaskNode(node)
}