/**
 * 视频动作模仿 Provider
 * 只负责调用 Volcengine API
 */

import { getMissingEnvVars, isVolcengineConfigured } from '@/lib/volcengine/client'
import {
  getMotionResult,
  isTaskFailed,
  isTaskPending,
  submitMotionTask,
} from '@/lib/volcengine/motion'
import { isRetryableError } from '@/lib/volcengine/types'

import type { ProviderExecuteResult, ProviderQueryResult } from '../../core/provider'
import { BaseProvider } from '../../core/provider'
import { ConfigurationError } from '../../errors'
import type { Task, TaskModeType, TaskResource, TaskTypeType } from '../../types'
import { ResourceType, TaskMode, TaskType } from '../../types'

/**
 * 视频动作模仿 Provider
 * 只负责调用 Volcengine API
 */
export class VideoMotionProvider extends BaseProvider {
  readonly taskType: TaskTypeType = TaskType.VIDEO_MOTION
  readonly mode: TaskModeType = TaskMode.ASYNC

  async execute(_task: Task, inputs: TaskResource[]): Promise<ProviderExecuteResult> {
    // 检查环境变量，当前确保火山第三方平台正确配置
    if (!isVolcengineConfigured()) {
      const missing = getMissingEnvVars()
      throw new ConfigurationError(`环境变量未配置: ${missing.join(', ')}`)
    }

    // 获取输入资源
    const imageInput = inputs.find((r) => r.resourceType === ResourceType.IMAGE && r.isInput)
    const videoInput = inputs.find((r) => r.resourceType === ResourceType.VIDEO && r.isInput)

    if (!imageInput || !videoInput) {
      return {
        success: false,
        error: '缺少必要的输入资源（图片和视频）',
        retryable: false,
      }
    }

    try {
      const externalTaskId = await submitMotionTask(imageInput.url, videoInput.url)
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
      const result = await getMotionResult(task.externalTaskId)

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

      // done
      if (!result.video_url) {
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
            url: result.video_url,
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
