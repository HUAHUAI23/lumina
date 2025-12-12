/**
 * POST /api/workflows/digital-human
 * 创建数字人工作流任务
 *
 * 工作流结构:
 * Start -> VIDEO_MOTION (并行)
 * Start -> AUDIO_TTS (并行)
 * VIDEO_MOTION -> VIDEO_LIPSYNC
 * AUDIO_TTS -> VIDEO_LIPSYNC
 * VIDEO_LIPSYNC -> End
 *
 * 流程：
 * 1. 接收文件和参数（FormData）
 * 2. 上传文件到 TOS 和 TTS API
 * 3. 创建或获取数字人工作流定义
 * 4. 创建 N 个工作流任务
 */

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { accounts, workflows } from '@/db/schema'
import { parseAudioMetadata, validateAudio } from '@/lib/audio-parser'
import { getCurrentSession } from '@/lib/auth/dal'
import { env } from '@/lib/env'
import { logger as baseLogger } from '@/lib/logger'
import { getTempPath, uploadFile } from '@/lib/tos'
import { parseVideoMetadata, validateVideo } from '@/lib/video-parser'
import { WorkflowExecMode, workflowService } from '@/lib/workflows'

const logger = baseLogger.child({ module: 'api/workflows/digital-human' })

// 最大文件大小
const MAX_IMAGE_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024 // 50MB

// 数字人工作流名称（用于查找已存在的定义）
const DIGITAL_HUMAN_WORKFLOW_NAME = '数字人视频生成工作流'

/**
 * 创建数字人工作流定义
 */
async function getOrCreateDigitalHumanWorkflow(accountId: number) {
  // 先查找是否已有该工作流定义
  const existing = await db.query.workflows.findFirst({
    where: eq(workflows.name, DIGITAL_HUMAN_WORKFLOW_NAME),
  })

  if (existing) {
    return existing
  }

  // 创建新的工作流定义
  const workflow = await workflowService.create({
    accountId,
    name: DIGITAL_HUMAN_WORKFLOW_NAME,
    description: '数字人视频生成：图像动作模仿 + TTS语音合成 -> 口型同步',
    nodes: [
      // 起始节点
      {
        id: 'start',
        type: 'start',
        name: '开始',
        execMode: 'sync',
        position: { x: 250, y: 0 },
        config: {
          inputVariables: [
            { name: 'imageUrl', type: 'url', required: true, description: '人物图片URL' },
            { name: 'videoUrl', type: 'url', required: true, description: '动作视频URL' },
            { name: 'videoDuration', type: 'number', required: true, description: '视频时长(秒)' },
            { name: 'text', type: 'string', required: true, description: 'TTS文本' },
            { name: 'referenceAudio', type: 'string', required: true, description: '参考音频路径' },
            { name: 'audioDuration', type: 'number', required: true, description: '音频时长(秒)' },
            { name: 'lipsyncConfig', type: 'object', required: false, description: '口型同步配置' },
          ],
        },
        handles: [{ id: 'out', position: 'bottom' as const, type: 'source' as const }],
      },
      // VIDEO_MOTION 节点
      {
        id: 'video_motion',
        type: 'video_motion',
        name: '生成数字人视频',
        execMode: 'async',
        position: { x: 100, y: 150 },
        config: {
          inputs: [
            { name: 'image', source: '$var.imageUrl' },
            { name: 'video', source: '$var.videoUrl' },
          ],
          taskConfig: {
            duration: '$var.videoDuration',
          },
        },
        handles: [
          { id: 'in', position: 'top' as const, type: 'target' as const },
          { id: 'out', position: 'bottom' as const, type: 'source' as const },
        ],
      },
      // AUDIO_TTS 节点
      {
        id: 'audio_tts',
        type: 'audio_tts',
        name: '生成语音',
        execMode: 'sync',
        position: { x: 400, y: 150 },
        config: {
          inputs: [{ name: 'referenceAudio', source: '$var.referenceAudio' }],
          taskConfig: {
            text: '$var.text',
            referenceAudio: '$var.referenceAudio',
            duration: '$var.audioDuration',
          },
        },
        handles: [
          { id: 'in', position: 'top' as const, type: 'target' as const },
          { id: 'out', position: 'bottom' as const, type: 'source' as const },
        ],
      },
      // VIDEO_LIPSYNC 节点
      {
        id: 'video_lipsync',
        type: 'video_lipsync',
        name: '口型同步',
        execMode: 'async',
        position: { x: 250, y: 300 },
        config: {
          inputs: [
            { name: 'video', source: '$node.video_motion.output.resources[0].url' },
            { name: 'audio', source: '$node.audio_tts.output.resources[0].url' },
          ],
          taskConfig: {
            duration: '$var.videoDuration',
            useBasicMode: '$var.lipsyncConfig.useBasicMode',
            separateVocal: '$var.lipsyncConfig.separateVocal',
            alignAudio: '$var.lipsyncConfig.alignAudio',
          },
        },
        handles: [
          { id: 'in', position: 'top' as const, type: 'target' as const },
          { id: 'out', position: 'bottom' as const, type: 'source' as const },
        ],
      },
      // 结束节点
      {
        id: 'end',
        type: 'end',
        name: '完成',
        execMode: 'sync',
        position: { x: 250, y: 450 },
        config: {
          outputVariables: [
            { name: 'outputVideo', source: '$node.video_lipsync.output.resources[0].url' },
          ],
        },
        handles: [{ id: 'in', position: 'top' as const, type: 'target' as const }],
      },
    ],
    edges: [
      // Start -> VIDEO_MOTION
      {
        id: 'e-start-motion',
        type: 'normal',
        source: 'start',
        target: 'video_motion',
        source_handle: 'out',
        target_handle: 'in',
      },
      // Start -> AUDIO_TTS
      {
        id: 'e-start-tts',
        type: 'normal',
        source: 'start',
        target: 'audio_tts',
        source_handle: 'out',
        target_handle: 'in',
      },
      // VIDEO_MOTION -> VIDEO_LIPSYNC
      {
        id: 'e-motion-lipsync',
        type: 'normal',
        source: 'video_motion',
        target: 'video_lipsync',
        source_handle: 'out',
        target_handle: 'in',
      },
      // AUDIO_TTS -> VIDEO_LIPSYNC
      {
        id: 'e-tts-lipsync',
        type: 'normal',
        source: 'audio_tts',
        target: 'video_lipsync',
        source_handle: 'out',
        target_handle: 'in',
      },
      // VIDEO_LIPSYNC -> End
      {
        id: 'e-lipsync-end',
        type: 'normal',
        source: 'video_lipsync',
        target: 'end',
        source_handle: 'out',
        target_handle: 'in',
      },
    ],
    variables: {
      imageUrl: { type: 'url', description: '人物图片URL' },
      videoUrl: { type: 'url', description: '动作视频URL' },
      videoDuration: { type: 'number', description: '视频时长' },
      text: { type: 'string', description: 'TTS文本' },
      referenceAudio: { type: 'string', description: '参考音频路径' },
      audioDuration: { type: 'number', description: '音频时长' },
      lipsyncConfig: { type: 'object' as 'string', description: '口型同步配置' },
    },
  })

  logger.info({ workflowId: workflow.id }, '创建数字人工作流定义成功')
  return workflow
}

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

    // VIDEO_MOTION 参数
    const imageFile = formData.get('image') as File | null
    const videoFile = formData.get('video') as File | null

    // AUDIO_TTS 参数
    const text = (formData.get('text') as string) || ''
    const audioFile = formData.get('audio') as File | null

    // VIDEO_LIPSYNC 配置
    const useBasicMode = formData.get('useBasicMode') === 'true'
    const separateVocal = formData.get('separateVocal') === 'true'
    const alignAudio = formData.get('alignAudio') !== 'false' // 默认 true

    // 数量参数
    const quantity = Math.min(Math.max(parseInt(formData.get('quantity') as string) || 1, 1), 10)
    const taskName = (formData.get('name') as string) || '数字人视频生成'

    // 4. 验证必填字段
    if (!imageFile || !videoFile) {
      return NextResponse.json(
        { success: false, error: '请上传人物图片和动作视频' },
        { status: 400 }
      )
    }

    if (!text || !audioFile) {
      return NextResponse.json(
        { success: false, error: '请提供TTS文本和参考音频' },
        { status: 400 }
      )
    }

    // 5. 验证文件大小
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { success: false, error: `图片文件过大，最大支持 ${MAX_IMAGE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    if (videoFile.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { success: false, error: `视频文件过大，最大支持 ${MAX_VIDEO_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { success: false, error: `音频文件过大，最大支持 ${MAX_AUDIO_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // 验证文本长度
    if (text.length === 0 || text.length > 5000) {
      return NextResponse.json(
        { success: false, error: '文本长度必须在 1-5000 字之间' },
        { status: 400 }
      )
    }

    logger.info(
      {
        userId: session.userId,
        imageSize: imageFile.size,
        videoSize: videoFile.size,
        audioSize: audioFile.size,
        textLength: text.length,
        quantity,
      },
      '开始创建数字人工作流任务'
    )

    // 6. 读取文件内容
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())

    // 7. 验证文件格式
    if (!validateVideo(videoBuffer, videoFile.type)) {
      return NextResponse.json({ success: false, error: '无效的视频文件格式' }, { status: 400 })
    }

    if (!validateAudio(audioBuffer, audioFile.type)) {
      return NextResponse.json({ success: false, error: '无效的音频文件格式' }, { status: 400 })
    }

    // 8. 解析媒体元数据
    logger.info('解析视频和音频元数据')
    const [videoMetadata, audioMetadata] = await Promise.all([
      parseVideoMetadata(videoBuffer, videoFile.type),
      parseAudioMetadata(audioBuffer, audioFile.type),
    ])

    if (!videoMetadata.duration || videoMetadata.duration <= 0) {
      return NextResponse.json(
        { success: false, error: '无法读取视频时长，请确保视频格式正确' },
        { status: 400 }
      )
    }

    if (!audioMetadata.duration || audioMetadata.duration <= 0) {
      return NextResponse.json(
        { success: false, error: '无法读取音频时长，请确保音频格式正确' },
        { status: 400 }
      )
    }

    logger.info(
      {
        videoDuration: videoMetadata.duration,
        audioDuration: audioMetadata.duration,
      },
      '媒体元数据解析完成'
    )

    // 9. 检查 TTS API 配置
    if (!env.TTS_API_BASE_URL) {
      logger.error('TTS API 未配置')
      return NextResponse.json(
        { success: false, error: 'TTS 服务未配置，请联系管理员' },
        { status: 503 }
      )
    }

    // 10. 上传文件到 TOS
    const uploadId = `workflow-${Date.now()}`
    const imageExt = imageFile.name.split('.').pop() || 'jpg'
    const videoExt = videoFile.name.split('.').pop() || 'mp4'
    const audioExt = audioFile.name.split('.').pop() || 'mp3'

    const imageKey = getTempPath(String(session.userId), uploadId, `image.${imageExt}`)
    const videoKey = getTempPath(String(session.userId), uploadId, `video.${videoExt}`)
    const audioKey = getTempPath(String(session.userId), uploadId, `audio.${audioExt}`)

    logger.info('上传文件到 TOS')
    const [imageUrl, videoUrl, _audioUrl] = await Promise.all([
      uploadFile(imageKey, imageBuffer, { contentType: imageFile.type }),
      uploadFile(videoKey, videoBuffer, { contentType: videoFile.type }),
      uploadFile(audioKey, audioBuffer, { contentType: audioFile.type }),
    ])

    // 11. 上传音频到 TTS API
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

    const uploadResult = (await uploadResponse.json()) as {
      filename: string
      reference_audio: string
      message: string
    }

    if (!uploadResult.reference_audio) {
      return NextResponse.json(
        { success: false, error: '上传失败: 服务器未返回参考路径' },
        { status: 500 }
      )
    }

    const referenceAudioPath = uploadResult.reference_audio
    logger.info({ referenceAudioPath }, '音频上传到 TTS API 成功')

    // 12. 获取或创建工作流定义
    const workflow = await getOrCreateDigitalHumanWorkflow(account.id)

    // 13. 创建工作流任务
    logger.info({ quantity }, `开始创建 ${quantity} 个工作流任务`)

    const workflowTasks = []
    for (let i = 1; i <= quantity; i++) {
      const name = quantity > 1 ? `${taskName} (${i}/${quantity})` : taskName

      const task = await workflowService.createTask({
        accountId: account.id,
        workflowId: workflow.id,
        execMode: WorkflowExecMode.ALL,
        runtimeVariables: {
          // VIDEO_MOTION 输入
          imageUrl,
          videoUrl,
          videoDuration: videoMetadata.duration,
          // AUDIO_TTS 输入
          text,
          referenceAudio: referenceAudioPath,
          audioDuration: audioMetadata.duration,
          // VIDEO_LIPSYNC 配置
          lipsyncConfig: {
            useBasicMode,
            separateVocal,
            alignAudio,
          },
          // 任务名称
          taskName: name,
        },
      })

      workflowTasks.push(task)
      logger.info(
        { taskId: task.id, index: i, total: quantity },
        `工作流任务 ${i}/${quantity} 创建成功`
      )
    }

    logger.info(
      {
        workflowId: workflow.id,
        taskCount: workflowTasks.length,
        taskIds: workflowTasks.map((t) => t.id),
      },
      '所有工作流任务创建完成'
    )

    // 14. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        workflow: {
          id: workflow.id,
          name: workflow.name,
        },
        tasks: workflowTasks.map((task) => ({
          id: task.id,
          status: task.status,
          createdAt: task.createdAt,
        })),
        metadata: {
          videoDuration: videoMetadata.duration,
          audioDuration: audioMetadata.duration,
          textLength: text.length,
          quantity,
        },
      },
    })
  } catch (error) {
    const err = error as Error
    const message = err.message || '创建工作流任务失败'

    if (message.includes('余额不足')) {
      logger.warn({ error: message }, '余额不足')
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    logger.error({ error: message, stack: err.stack }, '创建数字人工作流任务失败')
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
