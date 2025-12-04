/**
 * 任务系统初始化
 * 统一的初始化入口，自动注册所有 Provider 和 Handler
 */

import { logger as baseLogger } from '@/lib/logger'

// 导入所有 Provider 和 Handler
import { ALL_HANDLERS } from './handlers/impl'
import { handlerRegistry } from './handlers/registry'
import { ALL_PROVIDERS } from './providers/impl'
import { providerRegistry } from './providers/registry'
import { initScheduler } from './scheduler'

const logger = baseLogger.child({ module: 'tasks/init' })

/**
 * 初始化任务系统
 * - 注册所有 Provider
 * - 注册所有 Handler
 * - 启动调度器
 */
export function initTaskSystem(): void {
  logger.info('开始初始化任务系统...')

  // 1. 注册所有 Provider
  let providerCount = 0
  for (const ProviderClass of ALL_PROVIDERS) {
    try {
      const provider = new ProviderClass()
      providerRegistry.register(provider)
      providerCount++
    } catch (error) {
      logger.error({ error, provider: ProviderClass.name }, 'Provider 注册失败')
    }
  }

  // 2. 注册所有 Handler
  let handlerCount = 0
  for (const HandlerClass of ALL_HANDLERS) {
    try {
      const handler = new HandlerClass()
      handlerRegistry.register(handler)
      handlerCount++
    } catch (error) {
      logger.error({ error, handler: HandlerClass.name }, 'Handler 注册失败')
    }
  }

  // 3. 验证：确保每个 Provider 都有对应的 Handler
  const providers = providerRegistry.list()
  const handlers = handlerRegistry.list()

  const missingHandlers = providers.filter((type) => !handlers.includes(type))
  if (missingHandlers.length > 0) {
    logger.warn({ missingHandlers }, '以下任务类型缺少 Handler')
  }

  const missingProviders = handlers.filter((type) => !providers.includes(type))
  if (missingProviders.length > 0) {
    logger.warn({ missingProviders }, '以下任务类型缺少 Provider')
  }

  // 4. 启动调度器
  initScheduler()

  logger.info(
    {
      providers: providerCount,
      handlers: handlerCount,
      taskTypes: providers,
    },
    '任务系统初始化完成'
  )
}

/**
 * 获取支持的任务类型列表
 */
export function getSupportedTaskTypes() {
  const providers = providerRegistry.list()
  const handlers = handlerRegistry.list()

  // 只返回同时有 Provider 和 Handler 的任务类型
  return providers.filter((type) => handlers.includes(type))
}