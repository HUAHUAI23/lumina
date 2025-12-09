/**
 * 音频解析工具
 * 使用 ffprobe 从音频文件中提取元数据
 */

import ffmpeg from 'fluent-ffmpeg'
import { unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

export interface AudioMetadata {
  duration: number // 时长（秒）
  size: number
  mimeType: string
  bitrate?: number
  codec?: string
  sampleRate?: number
  channels?: number
}

/**
 * 从音频 Buffer 中提取元数据
 * 使用 ffprobe 解析音频信息
 */
export async function parseAudioMetadata(buffer: Buffer, mimeType: string): Promise<AudioMetadata> {
  // 创建临时文件
  const ext = mimeType.split('/')[1] || 'mp3'
  const tempPath = join(tmpdir(), `audio-${Date.now()}.${ext}`)

  try {
    // 写入临时文件
    await writeFile(tempPath, buffer)

    // 使用 ffprobe 获取音频信息
    const metadata = await new Promise<AudioMetadata>((resolve, reject) => {
      ffmpeg.ffprobe(tempPath, (err, metadata) => {
        if (err) {
          reject(new Error(`音频解析失败: ${err.message}`))
          return
        }

        // 获取音频流信息
        const audioStream = metadata.streams.find((s) => s.codec_type === 'audio')

        if (!audioStream) {
          reject(new Error('无法找到音频流'))
          return
        }

        // 计算时长（向上取整到秒）
        // audioStream.duration 和 metadata.format.duration 可能是字符串或数字
        const duration = audioStream.duration
          ? Math.ceil(parseFloat(String(audioStream.duration)))
          : metadata.format.duration
            ? Math.ceil(parseFloat(String(metadata.format.duration)))
            : 0

        resolve({
          duration,
          size: buffer.length,
          mimeType,
          bitrate: audioStream.bit_rate ? parseInt(String(audioStream.bit_rate)) : undefined,
          codec: audioStream.codec_name,
          sampleRate: audioStream.sample_rate ? parseInt(String(audioStream.sample_rate)) : undefined,
          channels: audioStream.channels,
        })
      })
    })

    return metadata
  } finally {
    // 清理临时文件
    try {
      await unlink(tempPath)
    } catch {
      // 忽略删除失败
    }
  }
}

/**
 * 验证音频文件格式
 */
export function validateAudio(buffer: Buffer, mimeType: string): boolean {
  // 检查文件大小（至少要有一些数据）
  if (buffer.length < 100) {
    return false
  }

  // 检查 MIME 类型
  const validMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/flac',
    'audio/x-flac',
    'audio/aac',
    'audio/m4a',
    'audio/x-m4a',
    'audio/ogg',
    'audio/opus',
  ]

  return validMimeTypes.includes(mimeType.toLowerCase())
}