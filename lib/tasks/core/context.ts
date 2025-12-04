/**
 * 任务执行上下文类型定义
 */

import type { Task, TaskOutputResource, TaskResource } from '../types'

/** 任务执行上下文 */
export interface ExecutionContext {
  task: Task
  inputs: TaskResource[]
}

/** 任务完成上下文 */
export interface CompletionContext {
  task: Task
  outputs: TaskOutputResource[] // Provider 返回的原始输出
  actualUsage?: number // Provider 返回的实际用量
}

/** 任务失败上下文 */
export interface FailureContext {
  task: Task
  error: string
  errorCode?: number
  retryable: boolean
}

/** 完成处理结果 */
export interface CompletionResult {
  uploadedOutputs: TaskOutputResource[] // 上传后的资源
  actualCost: number // 实际费用
}