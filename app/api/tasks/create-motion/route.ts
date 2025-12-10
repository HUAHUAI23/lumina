/**
 * POST /api/tasks/create-motion
 * 创建 video_motion 任务（专用接口）
 *
 * 流程：
 * 1. 接收图片和视频文件（FormData）
 * 2. 解析视频元数据（时长、尺寸）- 使用 ffprobe
 * 3. 上传文件到 TOS 临时目录（temp/{userId}/{uploadId}/{filename}）
 * 4. 计算费用（根据时长 * 数量 * pricing）
 * 5. 检查余额并创建任务（预扣费）
 */

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { accounts, VideoMotionConfig } from '@/db/schema'
import { getCurrentSession } from '@/lib/auth/dal'
import { logger as baseLogger } from '@/lib/logger'
import { taskService, TaskType } from '@/lib/tasks'
import { getTempPath, uploadFile } from '@/lib/tos'
import { parseVideoMetadata, validateVideo } from '@/lib/video-parser'

const logger = baseLogger.child({ module: 'api/tasks/create-motion' })

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
    const imageFile = formData.get('image') as File | null
    const videoFile = formData.get('video') as File | null
    const estimatedCount = parseInt(formData.get('estimatedCount') as string) || 1
    const taskName = (formData.get('name') as string) || '视频动作模仿任务'

    // 验证必填字段
    if (!imageFile || !videoFile) {
      return NextResponse.json({ success: false, error: '请上传图片和视频' }, { status: 400 })
    }

    // 验证文件大小
    if (imageFile.size > MAX_FILE_SIZE || videoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
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
        imageSize: imageFile.size,
        videoSize: videoFile.size,
        estimatedCount,
      },
      '开始创建 video_motion 任务'
    )

    // 4. 读取文件内容
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())

    // 5. 验证视频文件
    if (!validateVideo(videoBuffer, videoFile.type)) {
      return NextResponse.json({ success: false, error: '无效的视频文件格式' }, { status: 400 })
    }

    // 6. 解析视频元数据（使用 ffprobe）
    logger.info('解析视频元数据')
    const videoMetadata = await parseVideoMetadata(videoBuffer, videoFile.type)
    logger.info(
      {
        duration: videoMetadata.duration,
        width: videoMetadata.width,
        height: videoMetadata.height,
        codec: videoMetadata.codec,
      },
      '视频元数据解析完成'
    )

    if (!videoMetadata.duration || videoMetadata.duration <= 0) {
      return NextResponse.json(
        { success: false, error: '无法读取视频时长，请确保视频格式正确' },
        { status: 400 }
      )
    }

    // 7. 上传图片到 TOS 临时目录（temp/{userId}/{uploadId}/{filename}）
    const uploadId = `upload-${Date.now()}`
    const imageExt = imageFile.name.split('.').pop() || 'jpg'
    const imageKey = getTempPath(String(session.userId), uploadId, `image.${imageExt}`)
    logger.info({ key: imageKey }, '上传图片到 TOS')
    const imageUrl = await uploadFile(imageKey, imageBuffer, { contentType: imageFile.type })

    // 8. 上传视频到 TOS 临时目录
    const videoExt = videoFile.name.split('.').pop() || 'mp4'
    const videoKey = getTempPath(String(session.userId), uploadId, `video.${videoExt}`)
    logger.info({ key: videoKey }, '上传视频到 TOS')
    const videoUrl = await uploadFile(videoKey, videoBuffer, { contentType: videoFile.type })

    // 9. 创建任务（循环创建多个独立任务）
    logger.info(
      {
        duration: videoMetadata.duration,
        estimatedCount,
      },
      `开始创建任务，数量: ${estimatedCount}`
    )

    const tasks = []
    let totalEstimatedCost = 0

    // 循环创建 estimatedCount 个独立任务
    for (let i = 1; i <= estimatedCount; i++) {
      const taskNameWithIndex = estimatedCount > 1 ? `${taskName} (${i}/${estimatedCount})` : taskName

      const config: VideoMotionConfig = {
        taskType: 'video_motion',
        duration: videoMetadata.duration,
      }

      const task = await taskService.create({
        accountId: account.id,
        name: taskNameWithIndex,
        type: TaskType.VIDEO_MOTION,
        config,
        inputs: [
          {
            type: 'image',
            url: imageUrl,
            metadata: {
              filename: imageFile.name,
              size: imageFile.size,
              mimeType: imageFile.type,
            },
          },
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
              bitrate: videoMetadata.bitrate,
              codec: videoMetadata.codec,
            },
          },
        ],
        estimatedDuration: videoMetadata.duration,
        estimatedCount: 1, // 每个任务只生成 1 个视频
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
        videoMetadata: {
          duration: videoMetadata.duration,
          width: videoMetadata.width,
          height: videoMetadata.height,
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

    logger.error({ error: message }, '创建 video_motion 任务失败')
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
