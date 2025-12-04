/**
 * Handler 实现统一导出
 */

export { VideoMotionHandler } from './video-motion'

// 导出为数组，方便注册
import { VideoMotionHandler } from './video-motion'

export const ALL_HANDLERS = [VideoMotionHandler] as const