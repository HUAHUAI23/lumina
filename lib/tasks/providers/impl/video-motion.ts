/**
 * 视频动作模仿 Provider
 * 只负责调用 Volcengine API
 */

import { logger as baseLogger } from '@/lib/logger'
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

const logger = baseLogger.child({ module: 'tasks/providers/video-motion' })

/**
 * 视频动作模仿 Provider
 * 只负责调用 Volcengine API
 */
export class VideoMotionProvider extends BaseProvider {
  readonly taskType: TaskTypeType = TaskType.VIDEO_MOTION
  readonly mode: TaskModeType = TaskMode.ASYNC

  async execute(_task: Task, inputs: TaskResource[]): Promise<ProviderExecuteResult> {
    logger.info(
      { taskId: _task.id, retryCount: _task.retryCount },
      '🎬 [视频动作模仿] 开始提交任务'
    )

    // 检查环境变量，当前确保火山第三方平台正确配置
    if (!isVolcengineConfigured()) {
      const missing = getMissingEnvVars()
      throw new ConfigurationError(`环境变量未配置: ${missing.join(', ')}`)
    }

    // 获取输入资源
    const imageInput = inputs.find((r) => r.resourceType === ResourceType.IMAGE && r.isInput)
    const videoInput = inputs.find((r) => r.resourceType === ResourceType.VIDEO && r.isInput)

    if (!imageInput || !videoInput) {
      logger.error({ taskId: _task.id }, '❌ [视频动作模仿] 缺少必要的输入资源')
      return {
        success: false,
        error: '缺少必要的输入资源（图片和视频）',
        retryable: false,
      }
    }

    try {
      logger.info(
        {
          taskId: _task.id,
          imageUrl: imageInput.url,
          videoUrl: videoInput.url,
        },
        '📤 [视频动作模仿] 正在调用火山引擎API提交任务'
      )

      const externalTaskId = await submitMotionTask(imageInput.url, videoInput.url)

      logger.info(
        { taskId: _task.id, externalTaskId },
        '✅ [视频动作模仿] 任务提交成功，已获得外部任务ID'
      )

      return {
        success: true,
        externalTaskId,
      }
    } catch (error) {
      const err = error as Error & { code?: number }
      const retryable = err.code ? isRetryableError(err.code) : true

      logger.error(
        {
          taskId: _task.id,
          error: err.message,
          errorCode: err.code,
          retryable,
          retryCount: _task.retryCount,
        },
        retryable
          ? '⚠️ [视频动作模仿] 任务提交失败（可重试）'
          : '❌ [视频动作模仿] 任务提交失败（不可重试）'
      )

      return {
        success: false,
        error: err.message,
        errorCode: err.code,
        retryable,
      }
    }
  }

  async query(task: Task): Promise<ProviderQueryResult> {
    logger.info(
      { taskId: task.id, externalTaskId: task.externalTaskId },
      '🔍 [视频动作模仿] 开始查询任务状态'
    )

    if (!task.externalTaskId) {
      logger.error({ taskId: task.id }, '❌ [视频动作模仿] 缺少外部任务ID')
      return {
        status: 'failed',
        error: '缺少外部任务ID',
        retryable: false,
      }
    }

    try {
      // 解析任务配置，提取 AIGC 元数据
      const config = task.config as {
        aigcMeta?: {
          contentProducer?: string
          producerId: string
          contentPropagator: string
          propagateId?: string
        }
      }
      let aigcMeta

      if (config?.aigcMeta) {
        // 转换 camelCase 到 snake_case（匹配火山引擎 API 要求）
        aigcMeta = {
          content_producer: config.aigcMeta.contentProducer,
          producer_id: config.aigcMeta.producerId,
          content_propagator: config.aigcMeta.contentPropagator,
          propagate_id: config.aigcMeta.propagateId,
        }

        logger.info(
          { taskId: task.id, aigcMeta },
          '📋 [视频动作模仿] 使用 AIGC 元数据查询任务'
        )
      }

      const result = await getMotionResult(task.externalTaskId, aigcMeta)

      logger.info(
        { taskId: task.id, externalTaskId: task.externalTaskId, status: result.status },
        '📥 [视频动作模仿] 收到火山引擎API响应'
      )

      if (isTaskPending(result.status)) {
        logger.info(
          { taskId: task.id, externalTaskId: task.externalTaskId, status: result.status },
          '⏳ [视频动作模仿] 任务仍在处理中，等待下次查询'
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
            ? '⚠️ [视频动作模仿] 任务失败（可重试）- 任务已过期'
            : '❌ [视频动作模仿] 任务失败（不可重试）'
        )
        return {
          status: 'failed',
          error: `任务状态异常: ${result.status}`,
          retryable,
        }
      }

      // done
      if (!result.video_url) {
        logger.error(
          { taskId: task.id, externalTaskId: task.externalTaskId },
          '⚠️ [视频动作模仿] 任务完成但未返回视频URL（可重试）'
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
          videoUrl: result.video_url,
        },
        '🎉 [视频动作模仿] 任务完成成功！'
      )

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

      logger.error(
        {
          taskId: task.id,
          externalTaskId: task.externalTaskId,
          error: err.message,
          errorCode: err.code,
          retryable,
          retryCount: task.retryCount,
        },
        retryable
          ? '⚠️ [视频动作模仿] 查询任务失败（可重试）'
          : '❌ [视频动作模仿] 查询任务失败（不可重试）'
      )

      return {
        status: 'failed',
        error: err.message,
        errorCode: err.code,
        retryable,
      }
    }
  }
}
