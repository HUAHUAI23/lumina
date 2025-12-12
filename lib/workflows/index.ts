/**
 * 工作流模块导出
 */

// 类型导出
export * from './types'

// 服务导出
export type {
  CreateWorkflowParams,
  CreateWorkflowTaskParams,
  UpdateWorkflowParams,
} from './service'
export { workflowService } from './service'

// 调度器导出
export {
  isWorkflowSchedulerRunning,
  startWorkflowScheduler,
  stopWorkflowScheduler,
  triggerReconcile,
} from './scheduler'

// 初始化导出
export type { WorkflowSystemConfig } from './init'
export { getSupportedNodeTypes, initWorkflowSystem } from './init'

// 引擎导出（高级用法）
export { ExecutionContext } from './engine/context'
export { WorkflowExecutor, workflowExecutor } from './engine/executor'
export { evaluateCondition, interpolateString, resolveVariablePath } from './engine/expression'
export { WorkflowGraph } from './engine/graph'

// Handler 导出（扩展用）
export type { NodeHandler } from './handlers'
export { BaseNodeHandler, nodeHandlerRegistry } from './handlers'
