/**
 * POST /api/tasks/create-tts
 * 创建 audio_tts 任务（专用接口）
 *
 * 流程：
 * 1. 接收文本和参考音频文件（FormData）
 * 2. 解析音频元数据（时长）- 使用 ffprobe
 * 3. 上传音频到 TOS 临时目录（temp/{userId}/{uploadId}/{filename}）
 * 4. 上传音频到 TTS API 的上传接口
 * 5. 计算费用并创建任务（预扣费）
 */

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { accounts, AudioTtsConfig } from '@/db/schema'
import { parseAudioMetadata, validateAudio } from '@/lib/audio-parser'
import { getCurrentSession } from '@/lib/auth/dal'
import { env } from '@/lib/env'
import { logger as baseLogger } from '@/lib/logger'
import { taskService, TaskType } from '@/lib/tasks'
import { getTempPath, uploadFile } from '@/lib/tos'

const logger = baseLogger.child({ module: 'api/tasks/create-tts' })

// 最大文件大小（50MB）
const MAX_FILE_SIZE = 50 * 1024 * 1024

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
    const text = (formData.get('text') as string) || ''
    const audioFile = formData.get('audio') as File | null
    const estimatedCount = parseInt(formData.get('estimatedCount') as string) || 1
    const taskName = (formData.get('name') as string) || 'TTS 语音合成任务'

    // 验证必填字段
    if (!text || !audioFile) {
      return NextResponse.json({ success: false, error: '请提供文本和参考音频' }, { status: 400 })
    }

    // 验证文本长度
    if (text.length === 0 || text.length > 5000) {
      return NextResponse.json(
        { success: false, error: '文本长度必须在 1-5000 字之间' },
        { status: 400 }
      )
    }

    // 验证文件大小
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `音频文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // 验证数量
    if (estimatedCount < 1 || estimatedCount > 5) {
      return NextResponse.json(
        { success: false, error: '生成数量必须在 1-5 之间' },
        { status: 400 }
      )
    }

    logger.info(
      {
        userId: session.userId,
        textLength: text.length,
        audioSize: audioFile.size,
        estimatedCount,
      },
      '开始创建 audio_tts 任务'
    )

    // 4. 检查 TTS API 配置
    if (!env.TTS_API_BASE_URL) {
      logger.error('TTS API 未配置: TTS_API_BASE_URL 环境变量为空')
      return NextResponse.json(
        { success: false, error: 'TTS 服务未配置，请联系管理员' },
        { status: 503 }
      )
    }

    // 5. 读取音频文件内容
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())

    // 5. 验证音频文件
    if (!validateAudio(audioBuffer, audioFile.type)) {
      return NextResponse.json({ success: false, error: '无效的音频文件格式' }, { status: 400 })
    }

    // 6. 解析音频元数据（使用 ffprobe）
    logger.info('解析音频元数据')
    const audioMetadata = await parseAudioMetadata(audioBuffer, audioFile.type)
    logger.info(
      {
        duration: audioMetadata.duration,
        codec: audioMetadata.codec,
        sampleRate: audioMetadata.sampleRate,
      },
      '音频元数据解析完成'
    )

    if (!audioMetadata.duration || audioMetadata.duration <= 0) {
      return NextResponse.json(
        { success: false, error: '无法读取音频时长，请确保音频格式正确' },
        { status: 400 }
      )
    }

    // 7. 上传音频到 TOS 临时目录（temp/{userId}/{uploadId}/{filename}）
    const uploadId = `upload-${Date.now()}`
    const audioExt = audioFile.name.split('.').pop() || 'mp3'
    const audioKey = getTempPath(String(session.userId), uploadId, `reference.${audioExt}`)
    logger.info({ key: audioKey }, '上传音频到 TOS')
    const audioUrl = await uploadFile(audioKey, audioBuffer, { contentType: audioFile.type })

    // 8. 上传音频到 TTS API 的上传接口
    logger.info('上传音频到 TTS API')
    const uploadFormData = new FormData()
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type })
    uploadFormData.append('audio', audioBlob, audioFile.name)

    const uploadResponse = await fetch(`${env.TTS_API_BASE_URL}/upload-reference-audio`, {
      method: 'POST',
      body: uploadFormData,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      logger.error({ status: uploadResponse.status, error: errorText }, 'TTS API 上传音频失败')
      return NextResponse.json(
        { success: false, error: `上传参考音频失败: ${uploadResponse.statusText}` },
        { status: 500 }
      )
    }

    // 解析上传响应，获取服务器返回的参考音频路径
    const uploadResult = (await uploadResponse.json()) as {
      filename: string
      reference_audio: string
      message: string
      modified_time: string
      size: number
    }

    // 记录完整的上传响应（方便排查问题）
    logger.info({ uploadResult }, 'TTS API 上传响应')

    if (!uploadResult.reference_audio) {
      logger.error(
        { uploadResult: JSON.stringify(uploadResult, null, 2) },
        'TTS API 上传响应中缺少 reference_audio 字段'
      )
      return NextResponse.json({ success: false, error: '上传失败: 服务器未返回参考路径' }, { status: 500 })
    }

    // 使用服务器返回的参考音频路径（已包含 reference_audio/ 前缀）
    const referenceAudioPath = uploadResult.reference_audio

    logger.info(
      { filename: uploadResult.filename, path: referenceAudioPath, size: uploadResult.size },
      '音频上传到 TTS API 成功'
    )

    // 9. 创建任务（循环创建多个独立任务）
    logger.info(
      {
        duration: audioMetadata.duration,
        estimatedCount,
      },
      `开始创建任务，数量: ${estimatedCount}`
    )

    const tasks = []
    let totalEstimatedCost = 0

    // 循环创建 estimatedCount 个独立任务
    for (let i = 1; i <= estimatedCount; i++) {
      const taskNameWithIndex =
        estimatedCount > 1 ? `${taskName} (${i}/${estimatedCount})` : taskName

      const config: AudioTtsConfig = {
        taskType: 'audio_tts',
        text,
        referenceAudio: referenceAudioPath, // 使用服务器返回的参考音频路径
        duration: audioMetadata.duration,
      }

      const task = await taskService.create({
        accountId: account.id,
        name: taskNameWithIndex,
        type: TaskType.AUDIO_TTS,
        config,
        inputs: [
          {
            type: 'audio',
            url: audioUrl,
            metadata: {
              filename: audioFile.name,
              size: audioFile.size,
              mimeType: audioFile.type,
              duration: audioMetadata.duration,
              bitrate: audioMetadata.bitrate,
              codec: audioMetadata.codec,
              sampleRate: audioMetadata.sampleRate,
              channels: audioMetadata.channels,
            },
          },
        ],
        estimatedDuration: audioMetadata.duration,
        estimatedCount: 1, // 每个任务只生成 1 个音频
      })

      tasks.push(task)
      totalEstimatedCost += task.estimatedCost

      logger.info(
        {
          taskId: task.id,
          index: i,
          total: estimatedCount,
          estimatedCost: task.estimatedCost,
        },
        `任务 ${i}/${estimatedCount} 创建成功`
      )
    }

    logger.info(
      {
        taskCount: tasks.length,
        taskIds: tasks.map((t) => t.id),
        totalEstimatedCost,
        balance: account.balance,
      },
      '所有任务创建完成'
    )

    // 10. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        tasks: tasks.map((task) => ({
          id: task.id,
          type: task.type,
          name: task.name,
          status: task.status,
          estimatedCost: task.estimatedCost,
          createdAt: task.createdAt,
        })),
        totalEstimatedCost,
        audioMetadata: {
          duration: audioMetadata.duration,
          filename: audioFile.name,
        },
      },
    })
  } catch (error) {
    const err = error as Error
    const message = err.message || '创建任务失败'

    // 余额不足返回 400
    if (message.includes('余额不足')) {
      logger.warn({ error: message }, '余额不足')
      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 400 }
      )
    }

    logger.error({ error: message }, '创建 audio_tts 任务失败')
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}