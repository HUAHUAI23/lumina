/**
 * Handler 基类：负责任务的完整生命周期
 */

import type { TaskTypeType } from '../types'

import type { CompletionContext, CompletionResult, FailureContext } from './context'

/**
 * Handler 基类：负责任务的完整生命周期
 */
export abstract class BaseHandler {
  abstract readonly taskType: TaskTypeType

  /**
   * 处理任务完成（完整流程）
   */
  abstract handleCompletion(context: CompletionContext): Promise<CompletionResult>

  /**
   * 处理任务失败
   */
  abstract handleFailure(context: FailureContext): Promise<void>
}
