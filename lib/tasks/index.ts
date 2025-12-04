/**
 * 任务系统导出
 */

// 类型
export * from './types'

// 错误
export * from './errors'

// 核心接口
export type { CompletionContext, CompletionResult, FailureContext } from './core/context'
export { BaseHandler } from './core/handler'
export type { ProviderExecuteResult, ProviderQueryResult } from './core/provider'
export { BaseProvider } from './core/provider'
export { DefaultHandler } from './handlers/base-default'

// 注册表
export { handlerRegistry } from './handlers/registry'
export { providerRegistry } from './providers/registry'

// 服务
export * from './billing'
export { taskService } from './service'

// 调度器
export { initScheduler, isSchedulerRunning, startScheduler, stopScheduler } from './scheduler'

// 初始化
export { getSupportedTaskTypes, initTaskSystem } from './init'

// 可选：导出所有实现（用于测试或手动注册）
export * from './handlers/impl'
export * from './providers/impl'