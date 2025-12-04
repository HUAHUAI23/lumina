/**
 * Provider 实现统一导出
 */

export { VideoMotionProvider } from './video-motion'

// 导出为数组，方便注册
import { VideoMotionProvider } from './video-motion'

export const ALL_PROVIDERS = [VideoMotionProvider] as const