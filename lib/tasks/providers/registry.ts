/**
 * Provider 注册表
 */

import { logger } from '@/lib/logger'

import type { BaseProvider } from '../core/provider'
import type { TaskTypeType } from '../types'

class ProviderRegistry {
  private providers = new Map<TaskTypeType, BaseProvider>()

  register(provider: BaseProvider): void {
    if (this.providers.has(provider.taskType)) {
      logger.warn({ taskType: provider.taskType }, '覆盖已存在的 Provider')
    }
    this.providers.set(provider.taskType, provider)
    logger.info({ taskType: provider.taskType }, '注册 Provider')
  }

  get(taskType: TaskTypeType): BaseProvider | undefined {
    return this.providers.get(taskType)
  }

  has(taskType: TaskTypeType): boolean {
    return this.providers.has(taskType)
  }

  list(): TaskTypeType[] {
    return Array.from(this.providers.keys())
  }
}

export const providerRegistry = new ProviderRegistry()
