/**
 * FFprobe 队列管理
 *
 * 功能：
 * - 控制并发执行数量，避免 CPU 超载
 * - 提供超时保护，避免无限等待
 * - 监控队列状态，便于性能分析
 *
 * 使用场景：
 * - 音频/视频文件元数据解析
 * - 高并发上传场景
 */

import os from 'os'
import PQueue from 'p-queue'

import { logger as baseLogger } from './logger'

const logger = baseLogger.child({ module: 'ffprobe-queue' })

// 动态计算并发数：根据 CPU 核心数
const CPU_CORES = os.cpus().length
const DEFAULT_CONCURRENCY = Math.max(2, CPU_CORES - 1) // 预留 1 核给其他任务

// ✅ 创建全局 FFprobe 队列（单例）
export const ffprobeQueue = new PQueue({
  concurrency: DEFAULT_CONCURRENCY,
  timeout: 10000, // 单个 FFprobe 任务超时：10 秒
})

logger.info(
  {
    cpuCores: CPU_CORES,
    concurrency: DEFAULT_CONCURRENCY,
  },
  'FFprobe 队列已初始化'
)

// ✅ 队列事件监听
ffprobeQueue.on('add', () => {
  const stats = getQueueStats()

  // 队列积压预警
  if (stats.size > 10) {
    logger.warn(
      {
        queueSize: stats.size,
        pending: stats.pending,
      },
      '⚠️ FFprobe 队列积压'
    )
  }
})

ffprobeQueue.on('idle', () => {
  logger.debug('FFprobe 队列空闲')
})

ffprobeQueue.on('error', (error: Error) => {
  logger.error({ error }, '❌ FFprobe 队列错误')
})

/**
 * 获取队列状态
 */
export function getQueueStats() {
  return {
    size: ffprobeQueue.size, // 等待中的任务数
    pending: ffprobeQueue.pending, // 正在执行的任务数
    concurrency: DEFAULT_CONCURRENCY,
    isPaused: ffprobeQueue.isPaused,
  }
}

/**
 * 带超时保护的执行函数
 *
 * @param fn - 要执行的异步函数
 * @param maxWaitTime - 最大等待时间（排队 + 执行），默认 30 秒
 * @returns Promise<T>
 *
 * @example
 * const result = await executeWithTimeout(
 *   () => parseAudioMetadata(buffer, mimeType),
 *   30000
 * )
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  maxWaitTime: number = 30000
): Promise<T> {
  const startTime = Date.now()

  // 超时 Promise
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      const stats = getQueueStats()
      reject(
        new Error(
          `FFprobe 执行超时（等待时间超过 ${maxWaitTime / 1000} 秒）。` +
            `当前队列状态：${stats.pending} 个执行中，${stats.size} 个等待中。` +
            `建议稍后重试或上传更小的文件。`
        )
      )
    }, maxWaitTime)
  })

  // 任务 Promise
  const taskPromise = ffprobeQueue.add(async () => {
    const queueWaitTime = Date.now() - startTime

    if (queueWaitTime > 5000) {
      logger.warn({ queueWaitTime }, `⚠️ 任务在队列中等待了 ${queueWaitTime}ms`)
    }

    try {
      const result = await fn()
      const totalTime = Date.now() - startTime

      logger.debug(
        {
          totalTime,
          queueWaitTime,
          executeTime: totalTime - queueWaitTime,
        },
        'FFprobe 任务完成'
      )

      return result
    } catch (error) {
      const totalTime = Date.now() - startTime
      logger.error(
        {
          error,
          totalTime,
        },
        '❌ FFprobe 任务失败'
      )
      throw error
    }
  })

  // 竞速：先完成的获胜（正常完成 or 超时）
  return Promise.race([taskPromise, timeoutPromise])
}

/**
 * 检查队列是否繁忙
 *
 * @param threshold - 繁忙阈值（等待任务数），默认 20
 * @returns boolean
 */
export function isQueueBusy(threshold: number = 20): boolean {
  const stats = getQueueStats()
  return stats.size > threshold
}

/**
 * 获取建议的重试延迟时间（秒）
 * 根据当前队列长度动态计算
 */
export function getSuggestedRetryDelay(): number {
  const stats = getQueueStats()

  // 简单估算：每个任务平均 2 秒，除以并发数
  const estimatedWaitTime = (stats.size * 2) / stats.concurrency

  // 建议延迟：估算等待时间 + 缓冲（10 秒）
  return Math.ceil(estimatedWaitTime + 10)
}
