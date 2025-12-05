/**
 * Provider 实现统一导出
 */

export { VideoLipsyncProvider } from './video-lipsync'
export { VideoMotionProvider } from './video-motion'

// 导出为数组，方便注册
import { VideoLipsyncProvider } from './video-lipsync'
import { VideoMotionProvider } from './video-motion'

export const ALL_PROVIDERS = [VideoLipsyncProvider, VideoMotionProvider] as const
