/**
 * Provider 实现统一导出
 */

export { AudioTtsProvider } from './audio-tts'
export { VideoLipsyncProvider } from './video-lipsync'
export { VideoMotionProvider } from './video-motion'

// 导出为数组，方便注册
import { AudioTtsProvider } from './audio-tts'
import { VideoLipsyncProvider } from './video-lipsync'
import { VideoMotionProvider } from './video-motion'

export const ALL_PROVIDERS = [AudioTtsProvider, VideoLipsyncProvider, VideoMotionProvider] as const
