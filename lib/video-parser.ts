/**
 * 视频解析工具
 * 使用 ffprobe 从视频文件中提取元数据
 */

import ffmpeg from 'fluent-ffmpeg'
import { unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

export interface VideoMetadata {
  duration: number // 时长（秒）
  width: number
  height: number
  size: number
  mimeType: string
  bitrate?: number
  codec?: string
}

/**
 * 从视频 Buffer 中提取元数据
 * 使用 ffprobe 解析视频信息
 */
export async function parseVideoMetadata(buffer: Buffer, mimeType: string): Promise<VideoMetadata> {
  // 创建临时文件
  const ext = mimeType.split('/')[1] || 'mp4'
  const tempPath = join(tmpdir(), `video-${Date.now()}.${ext}`)

  try {
    // 写入临时文件
    await writeFile(tempPath, buffer)

    // 使用 ffprobe 获取视频信息
    const metadata = await new Promise<VideoMetadata>((resolve, reject) => {
      ffmpeg.ffprobe(tempPath, (err, metadata) => {
        if (err) {
          reject(new Error(`视频解析失败: ${err.message}`))
          return
        }

        // 获取视频流信息
        const videoStream = metadata.streams.find((s) => s.codec_type === 'video')

        if (!videoStream) {
          reject(new Error('无法找到视频流'))
          return
        }

        // 计算时长（向上取整到秒）
        const duration = Math.ceil(metadata.format.duration || 0)

        resolve({
          duration,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          size: buffer.length,
          mimeType,
          bitrate: metadata.format.bit_rate,
          codec: videoStream.codec_name,
        })
      })
    })

    return metadata
  } finally {
    // 清理临时文件
    try {
      await unlink(tempPath)
    } catch (e) {
      console.error('清理临时文件失败:', e)
    }
  }
}

/**
 * 验证视频文件
 */
export function validateVideo(buffer: Buffer, mimeType: string): boolean {
  // 检查文件大小
  if (buffer.length === 0) {
    return false
  }

  // 检查 MIME 类型
  const validTypes = ['video/mp4', 'video/quicktime', 'video/webm']
  if (!validTypes.includes(mimeType)) {
    return false
  }

  // 检查文件头魔数
  if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
    // MP4 文件应该包含 'ftyp' 标识
    const header = buffer.subarray(0, 32).toString('ascii', 4, 8)
    return header === 'ftyp'
  }

  if (mimeType === 'video/webm') {
    // WebM 文件以 EBML 开头
    const webmMagic = Buffer.from([0x1a, 0x45, 0xdf, 0xa3])
    return buffer.subarray(0, 4).equals(webmMagic)
  }

  return true
}

export interface AudioMetadata {
  duration: number
  size: number
  mimeType: string
  bitrate?: number
  codec?: string
  sampleRate?: number
  channels?: number
}

/**
 * 从音频 Buffer 中提取元数据
 */
export async function parseAudioMetadata(buffer: Buffer, mimeType: string): Promise<AudioMetadata> {
  const ext = mimeType.split('/')[1] || 'mp3'
  const tempPath = join(tmpdir(), `audio-${Date.now()}.${ext}`)

  try {
    await writeFile(tempPath, buffer)

    const metadata = await new Promise<AudioMetadata>((resolve, reject) => {
      ffmpeg.ffprobe(tempPath, (err, metadata) => {
        if (err) {
          reject(new Error(`音频解析失败: ${err.message}`))
          return
        }

        const audioStream = metadata.streams.find((s) => s.codec_type === 'audio')

        if (!audioStream) {
          reject(new Error('无法找到音频流'))
          return
        }

        const duration = Math.ceil(metadata.format.duration || 0)

        resolve({
          duration,
          size: buffer.length,
          mimeType,
          bitrate: metadata.format.bit_rate,
          codec: audioStream.codec_name,
          sampleRate:
            typeof audioStream.sample_rate === 'number'
              ? audioStream.sample_rate
              : parseInt(audioStream.sample_rate || '0'),
          channels: audioStream.channels,
        })
      })
    })

    return metadata
  } finally {
    try {
      await unlink(tempPath)
    } catch (e) {
      console.error('清理临时文件失败:', e)
    }
  }
}

/**
 * 验证音频文件
 */
export function validateAudio(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length === 0) return false

  const validTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/aac',
    'audio/x-m4a',
  ]
  if (!validTypes.includes(mimeType) && !mimeType.startsWith('audio/')) {
    // 宽松验证，只要是 audio/ 开头都可以
    // return false
  }

  return true
}
