/**
 * 视频动作模仿 Handler
 * 负责业务逻辑：资源处理、元数据提取等
 */

import { logger as baseLogger } from '@/lib/logger'

import type { FailureContext } from '../../core/context'
import type { TaskTypeType } from '../../types'
import { TaskType } from '../../types'
import { DefaultHandler } from '../base-default'

const logger = baseLogger.child({ module: 'tasks/handler/video-motion' })

/**
 * 视频动作模仿 Handler
 */
export class VideoMotionHandler extends DefaultHandler {
  readonly taskType: TaskTypeType = TaskType.VIDEO_MOTION

  /**
   * 失败处理：特殊告警
   */
  protected async onFailure(context: FailureContext): Promise<void> {
    // Volcengine 限流告警
    if (context.errorCode === 429) {
      // TODO: 发送告警
      logger.warn({ taskId: context.task.id, error: context.error }, 'Volcengine API 限流')
      // await alertService.send('Volcengine API 限流', { taskId: context.task.id })
    }
  }
}
