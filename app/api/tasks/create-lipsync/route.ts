/**
 * POST /api/tasks/create-lipsync
 * 创建 video_lipsync 任务
 *
 * 流程：
 * 1. 接收视频和音频文件（FormData）
 * 2. 解析元数据（使用 ffprobe）
 * 3. 上传文件到 TOS
 * 4. 计算费用
 * 5. 创建任务
 */

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { accounts, VideoLipsyncConfig } from '@/db/schema'
import { getCurrentSession } from '@/lib/auth/dal'
import { logger as baseLogger } from '@/lib/logger'
import { taskService, TaskType } from '@/lib/tasks'
import { getTempPath, uploadFile } from '@/lib/tos'
import {
  parseAudioMetadata,
  parseVideoMetadata,
  validateAudio,
  validateVideo,
} from '@/lib/video-parser'

const logger = baseLogger.child({ module: 'api/tasks/create-lipsync' })

// 最大文件大小（100MB）
const MAX_FILE_SIZE = 100 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // 1. 验证登录
    const session = await getCurrentSession()
    if (!session) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
    }

    // 2. 获取账户
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.userId, session.userId),
    })

    if (!account) {
      return NextResponse.json({ success: false, error: '账户不存在' }, { status: 404 })
    }

    // 3. 解析 FormData
    const formData = await request.formData()
    const videoFile = formData.get('video') as File | null
    const audioFile = formData.get('audio') as File | null
    const taskName = (formData.get('name') as string) || '视频改口型任务'

    // 解析配置参数
    const useBasicMode = formData.get('useBasicMode') === 'true'
    const separateVocal = formData.get('separateVocal') === 'true'
    const openScenedet = formData.get('openScenedet') === 'true' // Basic 模式专用
    const alignAudio = formData.get('alignAudio') !== 'false' // 默认 true (Lite 模式)
    const alignAudioReverse = formData.get('alignAudioReverse') === 'true' // Lite 模式专用

    // 验证必填字段
    if (!videoFile || !audioFile) {
      return NextResponse.json({ success: false, error: '请上传视频和音频文件' }, { status: 400 })
    }

    // 验证文件大小
    if (videoFile.size > MAX_FILE_SIZE || audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    logger.info(
      {
        userId: session.userId,
        videoSize: videoFile.size,
        audioSize: audioFile.size,
        mode: useBasicMode ? 'Basic' : 'Lite',
      },
      '开始创建 video_lipsync 任务'
    )

    // 4. 读取文件内容
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())

    // 5. 验证文件格式
    if (!validateVideo(videoBuffer, videoFile.type)) {
      return NextResponse.json({ success: false, error: '无效的视频文件格式' }, { status: 400 })
    }
    // validateAudio 比较宽松，主要检查 buffer
    if (!validateAudio(audioBuffer, audioFile.type)) {
      // 可以在这里增加更严格的检查， currently logging warn
      logger.warn({ type: audioFile.type }, '音频格式可能不支持，尝试继续')
    }

    // 6. 解析元数据
    logger.info('解析媒体元数据')
    const [videoMetadata, audioMetadata] = await Promise.all([
      parseVideoMetadata(videoBuffer, videoFile.type),
      parseAudioMetadata(audioBuffer, audioFile.type),
    ])

    logger.info(
      {
        videoDuration: videoMetadata.duration,
        audioDuration: audioMetadata.duration,
      },
      '媒体元数据解析完成'
    )

    if (!videoMetadata.duration || videoMetadata.duration <= 0) {
      return NextResponse.json({ success: false, error: '无法读取视频时长' }, { status: 400 })
    }
    if (!audioMetadata.duration || audioMetadata.duration <= 0) {
      return NextResponse.json({ success: false, error: '无法读取音频时长' }, { status: 400 })
    }

    // 7. 上传文件到 TOS
    const uploadId = `upload-${Date.now()}`

    // Upload Video
    const videoExt = videoFile.name.split('.').pop() || 'mp4'
    const videoKey = getTempPath(String(session.userId), uploadId, `video.${videoExt}`)
    const videoUrl = await uploadFile(videoKey, videoBuffer, { contentType: videoFile.type })

    // Upload Audio
    const audioExt = audioFile.name.split('.').pop() || 'mp3'
    const audioKey = getTempPath(String(session.userId), uploadId, `audio.${audioExt}`)
    const audioUrl = await uploadFile(audioKey, audioBuffer, { contentType: audioFile.type })

    // 8. 创建任务
    // 计费时长：通常以最终生成视频时长为准。
    // 如果 alignAudio=true (Loop video to match audio)，则时长 = audioDuration
    // 如果 alignAudio=false (Cut audio/video to min duration)，则时长 = min(video, audio)?
    // 文档中 Lite 模式 "align_audio: 当音频时长 > 视频时长时，视频正向循环播放"。这意味着生成视频变长。
    // Basic 模式通常也是由音频驱动口型，通常生成视频长度 = 音频长度（视频可能会定格或循环，或只处理部分）。
    // 安全起见，预估费用按照 max(video, audio) 或者直接按 audioDuration (口型生成主要是音频驱动)。
    // 这里我们采用 Audio Duration 作为主要计费依据（因为通常是为了让视频配音）。
    // User guide implies: "将视频中的人物口型根据指定的音频输入进行修改"。 Output duration usually matches Audio.
    const taskDuration = audioMetadata.duration

    const config: VideoLipsyncConfig = {
      taskType: 'video_lipsync',
      duration: taskDuration,
      useBasicMode,
      separateVocal,
      openScenedet: useBasicMode ? openScenedet : undefined,
      alignAudio: !useBasicMode ? alignAudio : undefined, // Only for Lite
      alignAudioReverse: !useBasicMode && alignAudio ? alignAudioReverse : undefined, // Only for Lite with alignAudio
    }

    const task = await taskService.create({
      accountId: account.id,
      name: taskName,
      type: TaskType.VIDEO_LIPSYNC,
      config,
      inputs: [
        {
          type: 'video',
          url: videoUrl,
          metadata: {
            filename: videoFile.name,
            size: videoFile.size,
            mimeType: videoFile.type,
            duration: videoMetadata.duration,
            width: videoMetadata.width,
            height: videoMetadata.height,
          },
        },
        {
          type: 'audio',
          url: audioUrl,
          metadata: {
            filename: audioFile.name,
            size: audioFile.size,
            mimeType: audioFile.type,
            duration: audioMetadata.duration,
          },
        },
      ],
      estimatedDuration: taskDuration,
      estimatedCount: 1,
    })

    logger.info(
      { taskId: task.id, estimatedCost: task.estimatedCost },
      'Video Lipsync 任务创建成功'
    )

    return NextResponse.json({
      success: true,
      data: {
        task: {
          id: task.id,
          type: task.type,
          name: task.name,
          status: task.status,
          estimatedCost: task.estimatedCost,
          createdAt: task.createdAt,
        },
        totalEstimatedCost: task.estimatedCost,
      },
    })
  } catch (error) {
    const err = error as Error
    const message = err.message || '创建任务失败'

    if (message.includes('余额不足')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    logger.error({ error: message }, '创建 video_lipsync 任务失败')
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
