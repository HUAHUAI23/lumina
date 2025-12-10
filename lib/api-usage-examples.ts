/**
 * API Client 和 API Response 配合使用示例
 *
 * 展示如何在前后端使用标准的 API 响应格式
 */

// ============================================================================
// 后端示例（API Route）
// ============================================================================

/**
 * GET /api/auth/me - 获取当前用户信息
 *
 * 推荐的写法：使用 successResponse 和 errorResponse 辅助函数
 */
/*
import { NextResponse } from 'next/server'
import { successResponse, errorResponse, HttpStatus } from '@/lib/api-response'

export async function GET() {
  try {
    const session = await getCurrentSession()
    
    if (!session) {
      return NextResponse.json(
        errorResponse('未登录'),
        { status: HttpStatus.UNAUTHORIZED }
      )
    }
    
    const user = await getUserById(session.userId)
    
    if (!user) {
      return NextResponse.json(
        errorResponse('用户不存在'),
        { status: HttpStatus.NOT_FOUND }
      )
    }
    
    // ✅ 成功响应
    return NextResponse.json(
      successResponse({
        id: user.id,
        username: user.username,
        email: user.email,
        credits: user.credits,
      })
    )
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return NextResponse.json(
      errorResponse('获取用户信息失败', error),
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    )
  }
}
*/

/**
 * POST /api/tasks - 创建任务
 *
 * 展示如何处理验证错误和业务逻辑错误
 */
/*
import { ZodError } from 'zod'

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession()
    
    if (!session) {
      return NextResponse.json(
        errorResponse('请先登录'),
        { status: HttpStatus.UNAUTHORIZED }
      )
    }
    
    const body = await request.json()
    
    // 参数验证
    const validated = createTaskSchema.parse(body)
    
    // 业务逻辑
    const account = await getAccount(session.userId)
    
    if (account.balance < estimatedCost) {
      return NextResponse.json(
        errorResponse('积分不足，请充值'),
        { status: HttpStatus.BAD_REQUEST }
      )
    }
    
    const task = await createTask(validated)
    
    // ✅ 成功响应
    return NextResponse.json(
      successResponse(task, '任务创建成功'),
      { status: HttpStatus.CREATED }
    )
    
  } catch (error) {
    // 处理验证错误
    if (error instanceof ZodError) {
      return NextResponse.json(
        errorResponse('参数验证失败', error.issues),
        { status: HttpStatus.BAD_REQUEST }
      )
    }
    
    // 处理其他错误
    console.error('创建任务失败:', error)
    return NextResponse.json(
      errorResponse('创建任务失败'),
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    )
  }
}
*/

/**
 * GET /api/tasks - 获取任务列表（分页）
 */
/*
import { paginatedResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession()
    
    if (!session) {
      return NextResponse.json(
        errorResponse('请先登录'),
        { status: HttpStatus.UNAUTHORIZED }
      )
    }
    
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const status = searchParams.get('status')
    
    // 查询数据
    const tasks = await getTasks(session.userId, { status, page, pageSize })
    const total = await countTasks(session.userId, { status })
    
    // ✅ 使用分页响应
    return NextResponse.json(
      successResponse(paginatedResponse(tasks, total, page, pageSize))
    )
    
  } catch (error) {
    console.error('获取任务列表失败:', error)
    return NextResponse.json(
      errorResponse('获取任务列表失败'),
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    )
  }
}
*/

// ============================================================================
// 前端示例（使用 API Client）
// ============================================================================

import { ApiError, DELETE, GET, POST } from '@/lib/api-client'
import type { ApiResponse, PaginatedData } from '@/lib/api-response'
import { isSuccessResponse } from '@/lib/api-response'

// 类型定义
interface User {
  id: number
  username: string
  email: string
  credits: number
}

interface Task {
  id: string
  type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  config: Record<string, unknown>
  createdAt: string
}

// ============================================================================
// 示例 1: 基础用法 - 获取用户信息
// ============================================================================

async function fetchCurrentUser(): Promise<User | null> {
  try {
    // 调用 API，指定响应类型
    const response = await GET<ApiResponse<User>>('/api/auth/me')

    // 方式1: 使用类型守卫
    if (isSuccessResponse(response)) {
      console.log('用户信息:', response.data)
      return response.data
    } else {
      console.error('错误:', response.error)
      return null
    }
  } catch (error) {
    // 处理网络错误、超时等
    if (error instanceof ApiError) {
      console.error(`HTTP ${error.status}:`, error.body)
    } else {
      console.error('请求失败:', error)
    }
    return null
  }
}

// ============================================================================
// 示例 2: POST 请求 - 创建任务
// ============================================================================

async function createVideoTask(config: Record<string, unknown>): Promise<Task | null> {
  try {
    const response = await POST<ApiResponse<Task>>('/api/tasks', {
      type: 'video-motion',
      config,
    })

    // 方式2: 直接检查 success 字段
    if (response.success) {
      console.log('✅ 任务创建成功:', response.data)
      // 可以访问可选的 message
      if (response.message) {
        console.log('提示:', response.message)
      }
      return response.data
    } else {
      console.error('❌ 创建失败:', response.error)
      // 开发环境可能有 details
      if (response.details) {
        console.error('详细信息:', response.details)
      }
      return null
    }
  } catch (error) {
    if (error instanceof ApiError) {
      // ApiError.body 包含后端返回的 JSON（已经是 ApiErrorResponse）
      const errorResponse = error.body as ApiResponse<never>
      if (errorResponse && !errorResponse.success) {
        console.error('服务器错误:', errorResponse.error)
      }
    }
    return null
  }
}

// ============================================================================
// 示例 3: 分页数据 - 获取任务列表
// ============================================================================

async function fetchTasks(page = 1, pageSize = 10, status?: string) {
  try {
    const response = await GET<ApiResponse<PaginatedData<Task>>>('/api/tasks', {
      params: { page, pageSize, status },
    })

    if (response.success) {
      const { items, total, totalPages } = response.data
      console.log(`获取到 ${items.length} 条任务，共 ${total} 条`)
      console.log(`当前第 ${page}/${totalPages} 页`)
      return response.data
    } else {
      console.error('获取失败:', response.error)
      return null
    }
  } catch (error) {
    console.error('请求失败:', error)
    return null
  }
}

// ============================================================================
// 示例 4: DELETE 请求 - 删除任务
// ============================================================================

async function deleteTask(taskId: string): Promise<boolean> {
  try {
    // DELETE 通常返回空数据或确认消息
    const response = await DELETE<ApiResponse<{ id: string }>>(`/api/tasks/${taskId}`)

    if (response.success) {
      console.log('✅ 任务已删除')
      return true
    } else {
      console.error('❌ 删除失败:', response.error)
      return false
    }
  } catch (error) {
    if (error instanceof ApiError) {
      // 处理特定错误码
      if (error.status === 404) {
        console.error('任务不存在')
      } else if (error.status === 403) {
        console.error('无权限删除此任务')
      }
    }
    return false
  }
}

// ============================================================================
// 示例 5: 在 React 组件中使用
// ============================================================================

/*
'use client'

import { useState, useEffect } from 'react'
import { GET } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-response'

export function UserProfile() {
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await GET<ApiResponse<User>>('/api/auth/me')
        
        if (response.success) {
          setUser(response.data)
          setError(null)
        } else {
          setError(response.error)
          setUser(null)
        }
      } catch (err) {
        setError('加载失败')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error}</div>
  if (!user) return <div>未登录</div>

  return (
    <div>
      <h1>{user.username}</h1>
      <p>积分: {user.credits}</p>
    </div>
  )
}
*/

// ============================================================================
// 示例 6: 错误处理最佳实践
// ============================================================================

/**
 * 通用的 API 调用包装器，统一处理错误
 */
async function apiCall<T>(apiFunction: () => Promise<ApiResponse<T>>): Promise<T | null> {
  try {
    const response = await apiFunction()

    if (response.success) {
      return response.data
    } else {
      // 统一错误处理
      console.error('API 错误:', response.error)
      // 可以在这里显示 toast 提示
      // toast.error(response.error)
      return null
    }
  } catch (error) {
    if (error instanceof ApiError) {
      // 401 会自动重定向，这里通常不会执行
      if (error.status === 401) {
        console.log('正在重定向到登录页...')
      }
      // 其他 HTTP 错误
      console.error(`HTTP ${error.status}:`, error.statusText)
    } else {
      // 网络错误、超时等
      console.error('请求失败:', error)
    }
    return null
  }
}

// 使用包装器
async function exampleUsage() {
  const user = await apiCall(() => GET<ApiResponse<User>>('/api/auth/me'))
  if (user) {
    console.log('用户:', user.username)
  }
}

// ============================================================================
// 总结
// ============================================================================

/**
 * 当前 API Client 的错误定义：
 *
 * 1. ApiError 类：
 *    - status: HTTP 状态码 (number)
 *    - statusText: HTTP 状态文本 (string)
 *    - body: 响应体 (unknown)，通常是后端返回的 JSON
 *
 * 2. 后端返回的 JSON 格式：
 *
 *    成功响应：
 *    {
 *      success: true,
 *      data: T,           // 实际数据
 *      message?: string   // 可选的成功消息
 *    }
 *
 *    错误响应：
 *    {
 *      success: false,
 *      error: string,     // 错误消息
 *      details?: unknown  // 可选的详细信息（仅开发环境）
 *    }
 *
 * 3. 使用流程：
 *    - 后端：使用 successResponse() / errorResponse() 创建响应
 *    - 前端：使用 GET/POST/... 调用 API，类型为 ApiResponse<T>
 *    - 前端：检查 response.success 判断成功/失败
 *    - 前端：成功时访问 response.data，失败时访问 response.error
 *
 * 4. 类型安全：
 *    - TypeScript 可以正确推断 data 和 error 的存在
 *    - 使用类型守卫 isSuccessResponse() 可以获得更好的类型提示
 */
