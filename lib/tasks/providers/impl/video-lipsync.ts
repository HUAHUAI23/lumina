/**
 * 视频改口型 Provider
 * 只负责调用 Volcengine API
 */

import { logger as baseLogger } from '@/lib/logger'
import { getMissingEnvVars, isVolcengineConfigured } from '@/lib/volcengine/client'
import {
  extractVideoUrl,
  getLipsyncResult,
  isTaskFailed,
  isTaskPending,
  type LipsyncOptions,
  submitLipsyncTask,
} from '@/lib/volcengine/lipsync'
import { isRetryableError } from '@/lib/volcengine/types'

import type { ProviderExecuteResult, ProviderQueryResult } from '../../core/provider'
import { BaseProvider } from '../../core/provider'
import { ConfigurationError } from '../../errors'
import type { Task, TaskModeType, TaskResource, TaskTypeType } from '../../types'
import { ResourceType, TaskMode, TaskType } from '../../types'

const logger = baseLogger.child({ module: 'tasks/providers/video-lipsync' })

/**
 * 视频改口型 Provider
 * 只负责调用 Volcengine API
 */
export class VideoLipsyncProvider extends BaseProvider {
  readonly taskType: TaskTypeType = TaskType.VIDEO_LIPSYNC
  readonly mode: TaskModeType = TaskMode.ASYNC

  async execute(_task: Task, inputs: TaskResource[]): Promise<ProviderExecuteResult> {
    logger.info({ taskId: _task.id, retryCount: _task.retryCount }, '🎤 [视频改口型] 开始提交任务')

    // 检查环境变量，当前确保火山第三方平台正确配置
    if (!isVolcengineConfigured()) {
      const missing = getMissingEnvVars()
      throw new ConfigurationError(`环境变量未配置: ${missing.join(', ')}`)
    }

    // 获取输入资源：视频 + 音频
    const videoInput = inputs.find((r) => r.resourceType === ResourceType.VIDEO && r.isInput)
    const audioInput = inputs.find((r) => r.resourceType === ResourceType.AUDIO && r.isInput)

    if (!videoInput || !audioInput) {
      logger.error({ taskId: _task.id }, '❌ [视频改口型] 缺少必要的输入资源')
      return {
        success: false,
        error: '缺少必要的输入资源（视频和音频）',
        retryable: false,
      }
    }

    try {
      // 从 task.config 中提取可选参数
      const config = (_task.config || {}) as Record<string, unknown>
      const options: LipsyncOptions = {
        useBasicMode: config.useBasicMode === true,
        separateVocal: config.separateVocal === true,
        openScenedet: config.openScenedet === true,
        alignAudio: config.alignAudio !== false, // 默认 true
        alignAudioReverse: config.alignAudioReverse === true,
        templStartSeconds:
          typeof config.templStartSeconds === 'number' ? config.templStartSeconds : 0,
      }

      logger.info(
        {
          taskId: _task.id,
          videoUrl: videoInput.url,
          audioUrl: audioInput.url,
          options,
        },
        '📤 [视频改口型] 正在调用火山引擎API提交任务'
      )

      const result = await submitLipsyncTask(videoInput.url, audioInput.url, options)

      logger.info(
        {
          taskId: _task.id,
          externalTaskId: result.taskId,
          requestId: result.requestId,
        },
        '✅ [视频改口型] 任务提交成功，已获得外部任务ID'
      )

      return {
        success: true,
        externalTaskId: result.taskId,
        requestId: result.requestId,
      }
    } catch (error) {
      const err = error as Error & { code?: number; requestId?: string }
      const retryable = err.code ? isRetryableError(err.code) : true

      logger.error(
        {
          taskId: _task.id,
          error: err.message,
          errorCode: err.code,
          requestId: err.requestId,
          retryable,
          retryCount: _task.retryCount,
        },
        retryable
          ? '⚠️ [视频改口型] 任务提交失败（可重试）'
          : '❌ [视频改口型] 任务提交失败（不可重试）'
      )

      return {
        success: false,
        error: err.message,
        errorCode: err.code,
        requestId: err.requestId,
        retryable,
      }
    }
  }

  async query(task: Task): Promise<ProviderQueryResult> {
    logger.info(
      { taskId: task.id, externalTaskId: task.externalTaskId },
      '🔍 [视频改口型] 开始查询任务状态'
    )

    if (!task.externalTaskId) {
      logger.error({ taskId: task.id }, '❌ [视频改口型] 缺少外部任务ID')
      return {
        status: 'failed',
        error: '缺少外部任务ID',
        retryable: false,
      }
    }

    // 类型检查：确保只处理 video_lipsync 类型的任务
    const config = task.config
    if (config.taskType !== TaskType.VIDEO_LIPSYNC) {
      logger.error(
        { taskId: task.id, actualType: config.taskType },
        '❌ [视频改口型] 任务类型不匹配，此 Provider 只处理 video_lipsync 类型'
      )
      return {
        status: 'failed',
        error: `任务类型不匹配: 期望 video_lipsync，实际 ${config.taskType}`,
        retryable: false,
      }
    }

    // 经过上面的类型守卫，TypeScript 现在知道 config 是 VideoLipsyncConfig 类型

    try {
      // 解析任务配置
      const useBasicMode = config.useBasicMode === true

      // 提取 AIGC 元数据（如果有）
      let aigcMeta
      if (config.aigcMeta) {
        // 转换 camelCase 到 snake_case（匹配火山引擎 API 要求）
        aigcMeta = {
          content_producer: config.aigcMeta.contentProducer,
          producer_id: config.aigcMeta.producerId,
          content_propagator: config.aigcMeta.contentPropagator,
          propagate_id: config.aigcMeta.propagateId,
        }

        logger.info({ taskId: task.id, aigcMeta }, '📋 [视频改口型] 使用 AIGC 元数据查询任务')
      }

      const result = await getLipsyncResult(task.externalTaskId, useBasicMode, aigcMeta)

      logger.info(
        { taskId: task.id, externalTaskId: task.externalTaskId, status: result.status },
        '📥 [视频改口型] 收到火山引擎API响应'
      )

      if (isTaskPending(result.status)) {
        logger.info(
          { taskId: task.id, externalTaskId: task.externalTaskId, status: result.status },
          '⏳ [视频改口型] 任务仍在处理中，等待下次查询'
        )
        return { status: 'pending' }
      }

      if (isTaskFailed(result.status)) {
        const retryable = result.status === 'expired'
        logger.error(
          {
            taskId: task.id,
            externalTaskId: task.externalTaskId,
            status: result.status,
            retryable,
            retryCount: task.retryCount,
          },
          retryable
            ? '⚠️ [视频改口型] 任务失败（可重试）- 任务已过期'
            : '❌ [视频改口型] 任务失败（不可重试）'
        )
        return {
          status: 'failed',
          error: `任务状态异常: ${result.status}`,
          retryable,
        }
      }

      // done - 从 resp_data 中提取视频 URL
      const videoUrl = extractVideoUrl(result.resp_data)

      if (!videoUrl) {
        logger.error(
          { taskId: task.id, externalTaskId: task.externalTaskId },
          '⚠️ [视频改口型] 任务完成但未返回视频URL（可重试）'
        )
        return {
          status: 'failed',
          error: '任务完成但未返回视频URL',
          retryable: true,
        }
      }

      logger.info(
        {
          taskId: task.id,
          externalTaskId: task.externalTaskId,
          videoUrl,
          aigcMetaTagged: result.aigc_meta_tagged,
        },
        '🎉 [视频改口型] 任务完成成功！'
      )

      return {
        status: 'completed',
        outputs: [
          {
            type: ResourceType.VIDEO,
            url: videoUrl,
            metadata: {
              duration: config.duration,
            },
          },
        ],
      }
    } catch (error) {
      const err = error as Error & { code?: number; requestId?: string }
      const retryable = err.code ? isRetryableError(err.code) : true

      logger.error(
        {
          taskId: task.id,
          externalTaskId: task.externalTaskId,
          error: err.message,
          errorCode: err.code,
          requestId: err.requestId,
          retryable,
          retryCount: task.retryCount,
        },
        retryable
          ? '⚠️ [视频改口型] 查询任务失败（可重试）'
          : '❌ [视频改口型] 查询任务失败（不可重试）'
      )

      return {
        status: 'failed',
        error: err.message,
        errorCode: err.code,
        requestId: err.requestId,
        retryable,
      }
    }
  }
}
