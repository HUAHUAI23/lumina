/**
 * 节点 Handler 注册表
 */

import { logger as baseLogger } from '@/lib/logger'

import type { NodeType } from '../types'

import type { NodeHandler } from './base'

const logger = baseLogger.child({ module: 'workflows/handlers/registry' })

class NodeHandlerRegistry {
  private handlers = new Map<NodeType, NodeHandler>()

  /**
   * 注册 Handler
   */
  register(handler: NodeHandler): void {
    if (this.handlers.has(handler.nodeType)) {
      logger.warn({ nodeType: handler.nodeType }, '覆盖已存在的节点 Handler')
    }
    this.handlers.set(handler.nodeType, handler)
    logger.info({ nodeType: handler.nodeType }, '注册节点 Handler')
  }

  /**
   * 获取 Handler
   */
  get(nodeType: NodeType): NodeHandler | undefined {
    return this.handlers.get(nodeType)
  }

  /**
   * 检查是否存在 Handler
   */
  has(nodeType: NodeType): boolean {
    return this.handlers.has(nodeType)
  }

  /**
   * 列出所有注册的节点类型
   */
  list(): NodeType[] {
    return Array.from(this.handlers.keys())
  }
}

export const nodeHandlerRegistry = new NodeHandlerRegistry()
