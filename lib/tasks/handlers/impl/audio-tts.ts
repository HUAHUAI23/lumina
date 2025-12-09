/**
 * 音频TTS Handler
 * 负责业务逻辑：资源处理、元数据提取等
 */

import { logger as baseLogger } from '@/lib/logger'

import type { TaskTypeType } from '../../types'
import { TaskType } from '../../types'
import { DefaultHandler } from '../base-default'

const logger = baseLogger.child({ module: 'tasks/handler/audio-tts' })

/**
 * 音频TTS Handler
 */
export class AudioTtsHandler extends DefaultHandler {
  readonly taskType: TaskTypeType = TaskType.AUDIO_TTS
}