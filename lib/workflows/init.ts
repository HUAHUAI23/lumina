/**
 * 工作流系统初始化
 * 统一的初始化入口，自动注册所有 Handler
 */

import { logger as baseLogger } from '@/lib/logger'

import { ALL_NODE_HANDLERS, nodeHandlerRegistry } from './handlers'
import { startWorkflowScheduler } from './scheduler'

const logger = baseLogger.child({ module: 'workflows/init' })

/** 工作流系统配置 */
export interface WorkflowSystemConfig {
  /** 是否启用调度器 */
  schedulerEnabled?: boolean
  /** reconcile 间隔（秒） */
  schedulerInterval?: number
  /** 每次批量处理的最大数量 */
  schedulerBatchSize?: number
  /** 并发执行数量 */
  schedulerConcurrency?: number
}

/**
 * 初始化工作流系统
 */
export function initWorkflowSystem(config?: WorkflowSystemConfig): void {
  logger.info('开始初始化工作流系统...')

  // 1. 注册所有节点 Handler
  let handlerCount = 0
  for (const HandlerClass of ALL_NODE_HANDLERS) {
    try {
      const handler = new HandlerClass()
      nodeHandlerRegistry.register(handler)
      handlerCount++
    } catch (error) {
      logger.error({ error, handler: HandlerClass.name }, '节点 Handler 注册失败')
    }
  }

  // 2. 启动调度器
  startWorkflowScheduler({
    enabled: config?.schedulerEnabled ?? true,
    interval: config?.schedulerInterval ?? 10,
    batchSize: config?.schedulerBatchSize ?? 20,
    concurrency: config?.schedulerConcurrency ?? 5,
  })

  logger.info(
    {
      handlers: handlerCount,
      nodeTypes: nodeHandlerRegistry.list(),
    },
    '工作流系统初始化完成'
  )
}

/**
 * 获取已注册的节点类型
 */
export function getSupportedNodeTypes() {
  return nodeHandlerRegistry.list()
}