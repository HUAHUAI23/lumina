/**
 * 任务 Provider 基类
 */

import type {
  ProviderExecuteResult,
  ProviderQueryResult,
  Task,
  TaskModeType,
  TaskResource,
  TaskTypeType,
} from '../types'

export abstract class BaseTaskProvider {
  /** Provider 支持的任务类型 */
  abstract readonly taskType: TaskTypeType

  /** 执行模式 */
  abstract readonly mode: TaskModeType

  /**
   * 执行任务
   * - 同步任务：直接执行并返回结果
   * - 异步任务：提交到第三方平台，返回 externalTaskId
   */
  abstract execute(task: Task, inputs: TaskResource[]): Promise<ProviderExecuteResult>

  /**
   * 查询异步任务状态（仅异步任务需要实现）
   */
  abstract query(task: Task): Promise<ProviderQueryResult>
}