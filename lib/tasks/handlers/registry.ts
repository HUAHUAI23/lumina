/**
 * Handler 注册表
 */

import { logger } from '@/lib/logger'

import type { BaseHandler } from '../core/handler'
import type { TaskTypeType } from '../types'

class HandlerRegistry {
  private handlers = new Map<TaskTypeType, BaseHandler>()

  register(handler: BaseHandler): void {
    if (this.handlers.has(handler.taskType)) {
      logger.warn({ taskType: handler.taskType }, '覆盖已存在的 Handler')
    }
    this.handlers.set(handler.taskType, handler)
    logger.info({ taskType: handler.taskType }, '注册 Handler')
  }

  get(taskType: TaskTypeType): BaseHandler | undefined {
    return this.handlers.get(taskType)
  }

  has(taskType: TaskTypeType): boolean {
    return this.handlers.has(taskType)
  }

  list(): TaskTypeType[] {
    return Array.from(this.handlers.keys())
  }
}

export const handlerRegistry = new HandlerRegistry()