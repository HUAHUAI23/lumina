/**
 * Handler 实现统一导出
 */

export { AudioTtsHandler } from './audio-tts'
export { VideoLipsyncHandler } from './video-lipsync'
export { VideoMotionHandler } from './video-motion'

// 导出为数组，方便注册
import { AudioTtsHandler } from './audio-tts'
import { VideoLipsyncHandler } from './video-lipsync'
import { VideoMotionHandler } from './video-motion'

export const ALL_HANDLERS = [AudioTtsHandler, VideoLipsyncHandler, VideoMotionHandler] as const
