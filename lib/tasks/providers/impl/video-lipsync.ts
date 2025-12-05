/**
 * 视频改口型 Provider
 * 只负责调用 Volcengine API
 */

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

/**
 * 视频改口型 Provider
 * 只负责调用 Volcengine API
 */
export class VideoLipsyncProvider extends BaseProvider {
  readonly taskType: TaskTypeType = TaskType.VIDEO_LIPSYNC
  readonly mode: TaskModeType = TaskMode.ASYNC

  async execute(_task: Task, inputs: TaskResource[]): Promise<ProviderExecuteResult> {
    // 检查环境变量，当前确保火山第三方平台正确配置
    if (!isVolcengineConfigured()) {
      const missing = getMissingEnvVars()
      throw new ConfigurationError(`环境变量未配置: ${missing.join(', ')}`)
    }

    // 获取输入资源：视频 + 音频
    const videoInput = inputs.find((r) => r.resourceType === ResourceType.VIDEO && r.isInput)
    const audioInput = inputs.find((r) => r.resourceType === ResourceType.AUDIO && r.isInput)

    if (!videoInput || !audioInput) {
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

      const externalTaskId = await submitLipsyncTask(videoInput.url, audioInput.url, options)

      return {
        success: true,
        externalTaskId,
      }
    } catch (error) {
      const err = error as Error & { code?: number }
      const retryable = err.code ? isRetryableError(err.code) : true
      return {
        success: false,
        error: err.message,
        errorCode: err.code,
        retryable,
      }
    }
  }

  async query(task: Task): Promise<ProviderQueryResult> {
    if (!task.externalTaskId) {
      return {
        status: 'failed',
        error: '缺少外部任务ID',
        retryable: false,
      }
    }

    try {
      // 从 task.config 中获取 useBasicMode
      const config = (task.config || {}) as Record<string, unknown>
      const useBasicMode = config.useBasicMode === true

      const result = await getLipsyncResult(task.externalTaskId, useBasicMode)

      if (isTaskPending(result.status)) {
        return { status: 'pending' }
      }

      if (isTaskFailed(result.status)) {
        return {
          status: 'failed',
          error: `任务状态异常: ${result.status}`,
          retryable: result.status === 'expired',
        }
      }

      // done - 从 resp_data 中提取视频 URL
      const videoUrl = extractVideoUrl(result.resp_data)

      if (!videoUrl) {
        return {
          status: 'failed',
          error: '任务完成但未返回视频URL',
          retryable: true,
        }
      }

      return {
        status: 'completed',
        outputs: [
          {
            type: ResourceType.VIDEO,
            url: videoUrl,
          },
        ],
      }
    } catch (error) {
      const err = error as Error & { code?: number }
      const retryable = err.code ? isRetryableError(err.code) : true
      return {
        status: 'failed',
        error: err.message,
        errorCode: err.code,
        retryable,
      }
    }
  }
}
