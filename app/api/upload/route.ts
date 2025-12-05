/**
 * POST /api/upload
 * 上传文件到 TOS 临时目录
 */

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { accounts } from '@/db/schema'
import { getCurrentSession } from '@/lib/auth/dal'
import { getTempPath, isTosConfigured, uploadFile } from '@/lib/tos'

// 支持的文件类型
const ALLOWED_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
}

// 最大文件大小（100MB）
const MAX_FILE_SIZE = 100 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // 1. 验证登录
    const session = await getCurrentSession()
    if (!session) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
    }

    // 2. 检查 TOS 配置
    if (!isTosConfigured()) {
      return NextResponse.json(
        { success: false, error: 'TOS 存储未配置' },
        { status: 500 }
      )
    }

    // 3. 获取账户
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.userId, session.userId),
    })

    if (!account) {
      return NextResponse.json({ success: false, error: '账户不存在' }, { status: 404 })
    }

    // 4. 解析文件
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileType = formData.get('type') as string | null // image | video | audio

    if (!file) {
      return NextResponse.json({ success: false, error: '请选择文件' }, { status: 400 })
    }

    if (!fileType || !ALLOWED_TYPES[fileType]) {
      return NextResponse.json(
        { success: false, error: '不支持的文件类型' },
        { status: 400 }
      )
    }

    // 5. 验证 MIME 类型
    if (!ALLOWED_TYPES[fileType].includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `不支持的 ${fileType} 格式: ${file.type}` },
        { status: 400 }
      )
    }

    // 6. 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // 7. 生成上传路径
    const uploadId = `upload-${Date.now()}`
    const ext = file.name.split('.').pop() || 'bin'
    const filename = `${fileType}.${ext}`
    const key = getTempPath(String(session.userId), uploadId, filename)

    // 8. 上传文件
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadFile(key, buffer, { contentType: file.type })

    // 9. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        url,
        uploadId,
        metadata: {
          filename: file.name,
          size: file.size,
          mimeType: file.type,
        },
      },
    })
  } catch (error) {
    console.error('[Upload] 上传失败:', error)
    return NextResponse.json(
      { success: false, error: '上传失败，请重试' },
      { status: 500 }
    )
  }
}