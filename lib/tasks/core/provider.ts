/**
 * Provider 基类：只负责与第三方 API 交互
 */

import type {
  Task,
  TaskModeType,
  TaskOutputResource,
  TaskResource,
  TaskTypeType,
} from '../types'

/** Provider 执行结果 */
export interface ProviderExecuteResult {
  success: boolean
  // 异步任务：返回外部任务ID
  externalTaskId?: string
  // 同步任务：直接返回输出
  outputs?: TaskOutputResource[]
  actualUsage?: number
  // 失败信息
  error?: string
  errorCode?: number
  retryable?: boolean
}

/** Provider 查询结果 */
export interface ProviderQueryResult {
  status: 'pending' | 'completed' | 'failed'
  outputs?: TaskOutputResource[]
  actualUsage?: number
  error?: string
  errorCode?: number
  retryable?: boolean
}

/**
 * Provider 基类：只负责与第三方 API 交互
 */
export abstract class BaseProvider {
  abstract readonly taskType: TaskTypeType
  abstract readonly mode: TaskModeType

  /**
   * 执行任务：提交到第三方平台
   */
  abstract execute(task: Task, inputs: TaskResource[]): Promise<ProviderExecuteResult>

  /**
   * 查询任务：查询第三方平台状态
   */
  abstract query(task: Task): Promise<ProviderQueryResult>
}