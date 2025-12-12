/**
 * 节点 Handler 基类
 */

import type { ExecutionContext } from '../engine/context'
import type { HandlerResult, NodeType } from '../types'

/**
 * 节点 Handler 接口
 */
export interface NodeHandler {
  /** 节点类型 */
  readonly nodeType: NodeType

  /**
   * 执行节点
   *
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(context: ExecutionContext): Promise<HandlerResult>
}

/**
 * 节点 Handler 基类
 */
export abstract class BaseNodeHandler implements NodeHandler {
  abstract readonly nodeType: NodeType

  abstract execute(context: ExecutionContext): Promise<HandlerResult>
}