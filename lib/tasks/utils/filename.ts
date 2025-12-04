/**
 * 文件名处理工具
 */

import { nanoid } from 'nanoid'
import path from 'path'

/**
 * 从 URL 中提取文件扩展名
 * @example
 * extractExtFromUrl('https://example.com/video.mp4?token=xxx') // '.mp4'
 * extractExtFromUrl('https://example.com/image') // null
 */
export function extractExtFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const ext = path.extname(pathname)
    return ext || null
  } catch {
    return null
  }
}

/**
 * 根据资源类型获取默认扩展名
 */
export function getDefaultExtension(resourceType: string): string {
  const defaults: Record<string, string> = {
    video: '.mp4',
    image: '.jpg',
    audio: '.mp3',
    model_3d: '.obj',
    text: '.txt',
  }
  return defaults[resourceType] || '.bin'
}

/**
 * 根据 MIME 类型获取扩展名
 */
export function getExtensionFromMimeType(mimeType: string): string | null {
  const mimeToExt: Record<string, string> = {
    // 视频
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'video/x-matroska': '.mkv',

    // 图片
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/svg+xml': '.svg',

    // 音频
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/aac': '.aac',

    // 3D 模型
    'model/gltf-binary': '.glb',
    'model/gltf+json': '.gltf',
  }
  return mimeToExt[mimeType.toLowerCase()] || null
}

/**
 * 生成唯一的输出文件名
 * @param taskId 任务ID
 * @param taskType 任务类型
 * @param resourceType 资源类型（video/image等）
 * @param index 输出索引
 * @param originalUrl 原始URL（用于提取扩展名）
 * @param mimeType 可选的 MIME 类型
 */
export function generateOutputFilename(params: {
  taskId: number
  taskType: string
  resourceType: string
  index: number
  originalUrl?: string
  mimeType?: string
}): string {
  const { taskId, taskType, resourceType, index, originalUrl, mimeType } = params

  // 1. 尝试从 URL 提取扩展名
  let ext: string | null = null
  if (originalUrl) {
    ext = extractExtFromUrl(originalUrl)
  }

  // 2. 尝试从 MIME 类型获取扩展名
  if (!ext && mimeType) {
    ext = getExtensionFromMimeType(mimeType)
  }

  // 3. 使用默认扩展名
  if (!ext) {
    ext = getDefaultExtension(resourceType)
  }

  // 4. 生成唯一标识（使用 nanoid 而不是 Date.now()）
  const uniqueId = nanoid(10)

  // 5. 组合文件名：{taskType}_{taskId}_{index}_{uniqueId}{ext}
  const filename = `${taskType}_${taskId}_${index}_${uniqueId}${ext}`

  return filename
}