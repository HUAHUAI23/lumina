/**
 * POST /api/tasks - 创建任务
 * GET /api/tasks - 获取任务列表
 */

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { accounts, type TaskConfig } from '@/db/schema'
import { getCurrentSession } from '@/lib/auth/dal'
import { taskService, TaskStatus, TaskType, type TaskTypeType } from '@/lib/tasks'

// ==================== POST: 创建任务 ====================

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

    // 3. 解析请求体
    const body = await request.json()
    const { type, name, config, inputs, estimatedDuration } = body

    // 4. 验证任务类型
    const validTypes = Object.values(TaskType)
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `无效的任务类型: ${type}` },
        { status: 400 }
      )
    }

    // 5. 创建任务
    const task = await taskService.create({
      accountId: account.id,
      name,
      type: type as TaskTypeType,
      config: (config || {}) as TaskConfig,
      inputs,
      estimatedDuration,
    })

    // 6. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        id: task.id,
        type: task.type,
        name: task.name,
        status: task.status,
        estimatedCost: task.estimatedCost,
        createdAt: task.createdAt,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建任务失败'

    // 余额不足返回 400
    if (message.includes('余额不足')) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INSUFFICIENT_BALANCE', message },
        },
        { status: 400 }
      )
    }

    console.error('[Tasks] 创建任务失败:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ==================== GET: 获取任务列表 ====================

export async function GET(request: NextRequest) {
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

    // 3. 解析查询参数
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as (typeof TaskStatus)[keyof typeof TaskStatus] | null
    const type = searchParams.get('type') as TaskTypeType | null
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 4. 查询任务列表
    const result = await taskService.list(account.id, {
      status: status || undefined,
      type: type || undefined,
      limit: Math.min(limit, 100),
      offset,
    })

    // 5. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        tasks: result.tasks.map((task) => ({
          id: task.id,
          type: task.type,
          name: task.name,
          status: task.status,
          estimatedCost: task.estimatedCost,
          actualCost: task.actualCost,
          createdAt: task.createdAt,
          completedAt: task.completedAt,
        })),
        pagination: {
          total: result.total,
          limit,
          offset,
        },
      },
    })
  } catch (error) {
    console.error('[Tasks] 获取任务列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取任务列表失败' },
      { status: 500 }
    )
  }
}