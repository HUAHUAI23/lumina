/**
 * Handler 实现统一导出
 */

export { VideoLipsyncHandler } from './video-lipsync'
export { VideoMotionHandler } from './video-motion'

// 导出为数组，方便注册
import { VideoLipsyncHandler } from './video-lipsync'
import { VideoMotionHandler } from './video-motion'

export const ALL_HANDLERS = [VideoLipsyncHandler, VideoMotionHandler] as const
