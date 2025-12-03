/**
 * GET /api/tasks/[id] - 获取任务详情
 * DELETE /api/tasks/[id] - 取消任务
 */

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { accounts, tasks } from '@/db/schema'
import { getCurrentSession } from '@/lib/auth/dal'
import { taskService } from '@/lib/tasks'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ==================== GET: 获取任务详情 ====================

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // 3. 解析任务 ID
    const { id } = await params
    const taskId = parseInt(id)

    if (isNaN(taskId)) {
      return NextResponse.json({ success: false, error: '无效的任务 ID' }, { status: 400 })
    }

    // 4. 获取任务详情
    const result = await taskService.get(taskId)

    if (!result) {
      return NextResponse.json({ success: false, error: '任务不存在' }, { status: 404 })
    }

    // 5. 验证权限（只能查看自己的任务）
    if (result.task.accountId !== account.id) {
      return NextResponse.json({ success: false, error: '无权访问此任务' }, { status: 403 })
    }

    // 6. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        id: result.task.id,
        type: result.task.type,
        name: result.task.name,
        status: result.task.status,
        config: result.task.config,
        estimatedCost: result.task.estimatedCost,
        actualCost: result.task.actualCost,
        inputs: result.inputs.map((r) => ({
          type: r.resourceType,
          url: r.url,
          metadata: r.metadata,
        })),
        outputs: result.outputs.map((r) => ({
          type: r.resourceType,
          url: r.url,
          metadata: r.metadata,
        })),
        createdAt: result.task.createdAt,
        startedAt: result.task.startedAt,
        completedAt: result.task.completedAt,
      },
    })
  } catch (error) {
    console.error('[Tasks] 获取任务详情失败:', error)
    return NextResponse.json(
      { success: false, error: '获取任务详情失败' },
      { status: 500 }
    )
  }
}

// ==================== DELETE: 取消任务 ====================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // 3. 解析任务 ID
    const { id } = await params
    const taskId = parseInt(id)

    if (isNaN(taskId)) {
      return NextResponse.json({ success: false, error: '无效的任务 ID' }, { status: 400 })
    }

    // 4. 获取任务
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId))

    if (!task) {
      return NextResponse.json({ success: false, error: '任务不存在' }, { status: 404 })
    }

    // 5. 验证权限
    if (task.accountId !== account.id) {
      return NextResponse.json({ success: false, error: '无权取消此任务' }, { status: 403 })
    }

    // 6. 取消任务
    await taskService.cancel(taskId)

    // 7. 返回结果
    return NextResponse.json({
      success: true,
      message: '任务已取消',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '取消任务失败'
    console.error('[Tasks] 取消任务失败:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}