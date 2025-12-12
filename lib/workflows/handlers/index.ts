/**
 * 节点 Handler 模块导出
 */

export { BaseNodeHandler, type NodeHandler } from './base'
export { nodeHandlerRegistry } from './registry'

// 控制节点 Handler
export {
  ConditionNodeHandler,
  DelayNodeHandler,
  EndNodeHandler,
  StartNodeHandler,
  VariableSetNodeHandler,
} from './control'

// 任务节点 Handler
export {
  AudioTTSNodeHandler,
  TaskNodeHandler,
  VideoLipsyncNodeHandler,
  VideoMotionNodeHandler,
} from './task'

// 所有 Handler 类（用于初始化注册）
import {
  ConditionNodeHandler,
  DelayNodeHandler,
  EndNodeHandler,
  StartNodeHandler,
  VariableSetNodeHandler,
} from './control'
import { AudioTTSNodeHandler, VideoLipsyncNodeHandler, VideoMotionNodeHandler } from './task'

export const ALL_NODE_HANDLERS = [
  // 控制节点
  StartNodeHandler,
  EndNodeHandler,
  VariableSetNodeHandler,
  ConditionNodeHandler,
  DelayNodeHandler,
  // 任务节点
  VideoMotionNodeHandler,
  VideoLipsyncNodeHandler,
  AudioTTSNodeHandler,
]
