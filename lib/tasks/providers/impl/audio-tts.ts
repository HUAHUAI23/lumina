/**
 * 音频TTS Provider
 * 只负责调用 TTS API
 */

import { env } from '@/lib/env'
import { logger as baseLogger } from '@/lib/logger'

import type { ProviderExecuteResult, ProviderQueryResult } from '../../core/provider'
import { BaseProvider } from '../../core/provider'
import { ConfigurationError } from '../../errors'
import type { Task, TaskModeType, TaskResource, TaskTypeType } from '../../types'
import { ResourceType, TaskMode, TaskType } from '../../types'

const logger = baseLogger.child({ module: 'tasks/providers/audio-tts' })

/**
 * 同步任务重试配置
 */
const RETRY_CONFIG = {
  retryDelay: 1000, // 重试延迟（毫秒）
  retryableStatusCodes: [408, 429, 500, 502, 503, 504], // 可重试的 HTTP 状态码
}

/**
 * 检查 TTS API 是否已配置
 */
function isTtsConfigured(): boolean {
  return !!env.TTS_API_BASE_URL
}

/**
 * 音频TTS Provider
 * 只负责调用 TTS API（同步模式）
 */
export class AudioTtsProvider extends BaseProvider {
  readonly taskType: TaskTypeType = TaskType.AUDIO_TTS
  readonly mode: TaskModeType = TaskMode.SYNC

  async execute(_task: Task, _inputs: TaskResource[]): Promise<ProviderExecuteResult> {
    logger.info({ taskId: _task.id, retryCount: _task.retryCount }, '🎙️ [音频TTS] 开始执行TTS任务')

    // 检查环境变量
    if (!isTtsConfigured()) {
      throw new ConfigurationError('TTS API 未配置: TTS_API_BASE_URL')
    }

    // 类型检查：确保只处理 audio_tts 类型的任务
    const config = _task.config
    if (config.taskType !== TaskType.AUDIO_TTS) {
      logger.error(
        { taskId: _task.id, actualType: config.taskType },
        '❌ [音频TTS] 任务类型不匹配，此 Provider 只处理 audio_tts 类型'
      )
      return {
        success: false,
        error: `任务类型不匹配: 期望 audio_tts，实际 ${config.taskType}`,
        retryable: false,
      }
    }

    // 同步任务内部重试循环
    const maxRetries = env.TASK_MAX_RETRIES
    let lastError: { error: string; errorCode?: number; retryable: boolean } | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(
            { taskId: _task.id, attempt, maxRetries },
            `🔄 [音频TTS] 开始第 ${attempt} 次重试`
          )
        }

        logger.info(
          {
            taskId: _task.id,
            textLength: config.text.length,
            referenceAudio: config.referenceAudio,
            attempt,
          },
          '📤 [音频TTS] 正在调用TTS API生成语音'
        )

        // 调用 TTS API
        const response = await fetch(`${env.TTS_API_BASE_URL}/process-tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: config.text,
            reference_audio: config.referenceAudio,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          const isRetryable = RETRY_CONFIG.retryableStatusCodes.includes(response.status)

          logger.error(
            {
              taskId: _task.id,
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              attempt,
              isRetryable,
            },
            '❌ [音频TTS] TTS API 返回错误'
          )

          lastError = {
            error: `TTS API 错误: ${response.status} ${response.statusText}`,
            errorCode: response.status,
            retryable: isRetryable,
          }

          // 不可重试的错误直接返回
          if (!isRetryable) {
            return { success: false, ...lastError }
          }

          // 可重试但已达最大次数
          if (attempt >= maxRetries) {
            logger.error(
              { taskId: _task.id, attempts: attempt + 1 },
              '❌ [音频TTS] 已达最大重试次数，任务失败'
            )
            return { success: false, ...lastError }
          }

          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, RETRY_CONFIG.retryDelay))
          continue
        }

        // 获取音频数据（FLAC 格式）
        const audioBuffer = await response.arrayBuffer()

        // 将音频转换为 Base64 Data URL（Node.js 方式）
        // 注意：这将在 Handler 中上传到 TOS
        const base64Audio = Buffer.from(audioBuffer).toString('base64')
        const audioDataUrl = `data:audio/flac;base64,${base64Audio}`

        logger.info(
          {
            taskId: _task.id,
            audioSize: audioBuffer.byteLength,
            attempt,
            ...(attempt > 0 && { retriedSuccessfully: true }),
          },
          attempt > 0
            ? `✅ [音频TTS] 重试成功（第 ${attempt} 次重试）`
            : '✅ [音频TTS] TTS 生成成功'
        )

        return {
          success: true,
          outputs: [
            {
              type: ResourceType.AUDIO,
              url: audioDataUrl,
              metadata: {
                duration: config.duration,
                mimeType: 'audio/flac',
                size: audioBuffer.byteLength,
              },
            },
          ],
        }
      } catch (error) {
        const err = error as Error & { code?: string }
        const isNetworkError = err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT'

        logger.error(
          {
            taskId: _task.id,
            error: err.message,
            code: err.code,
            attempt,
            isNetworkError,
          },
          '❌ [音频TTS] TTS 请求异常'
        )

        lastError = {
          error: err.message,
          retryable: isNetworkError,
        }

        // 不可重试的错误直接返回
        if (!isNetworkError) {
          return { success: false, ...lastError }
        }

        // 可重试但已达最大次数
        if (attempt >= maxRetries) {
          logger.error(
            { taskId: _task.id, attempts: attempt + 1 },
            '❌ [音频TTS] 已达最大重试次数，任务失败'
          )
          return { success: false, ...lastError }
        }

        // 等待后重试
        await new Promise((resolve) => setTimeout(resolve, RETRY_CONFIG.retryDelay))
      }
    }

    // 理论上不会到这里，但为了类型安全
    return {
      success: false,
      error: lastError?.error || '未知错误',
      errorCode: lastError?.errorCode,
      retryable: false,
    }
  }

  async query(_task: Task): Promise<ProviderQueryResult> {
    // 同步任务不需要查询
    logger.warn({ taskId: _task.id }, '⚠️ [音频TTS] 同步任务不应调用 query 方法')
    return {
      status: 'failed',
      error: '同步任务不支持查询',
      retryable: false,
    }
  }
}
