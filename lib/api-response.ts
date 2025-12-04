/**
 * 标准 API 响应类型定义
 *
 * 定义后端 API 返回的标准 JSON 格式，确保前后端类型一致性
 *
 * @example 后端使用示例
 * ```typescript
 * import { successResponse, errorResponse } from '@/lib/api-response'
 *
 * // 成功响应
 * return NextResponse.json(successResponse(user))
 *
 * // 错误响应
 * return NextResponse.json(errorResponse('用户不存在'), { status: 404 })
 * ```
 *
 * @example 前端使用示例
 * ```typescript
 * import { GET } from '@/lib/api-client'
 * import type { ApiResponse } from '@/lib/api-response'
 *
 * const response = await GET<ApiResponse<User>>('/api/auth/me')
 * if (response.success) {
 *   console.log(response.data) // TypeScript 知道 data 存在
 * } else {
 *   console.error(response.error) // TypeScript 知道 error 存在
 * }
 * ```
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 成功响应类型
 *
 * @template T - 返回数据的类型
 */
export interface ApiSuccessResponse<T = unknown> {
  /** 请求是否成功 */
  success: true
  /** 返回的数据 */
  data: T
  /** 可选的成功消息 */
  message?: string
}

/**
 * 错误响应类型
 */
export interface ApiErrorResponse {
  /** 请求是否成功 */
  success: false
  /** 错误消息 */
  error: string
  /** 可选的详细错误信息（开发环境使用） */
  details?: unknown
}

/**
 * 统一的 API 响应类型
 *
 * @template T - 成功时返回数据的类型
 *
 * @example
 * ```typescript
 * // 定义接口返回类型
 * interface User {
 *   id: number
 *   username: string
 *   email: string
 * }
 *
 * // 使用
 * const response = await GET<ApiResponse<User>>('/api/auth/me')
 *
 * // TypeScript 类型保护
 * if (response.success) {
 *   console.log(response.data.username) // ✅ 类型安全
 * } else {
 *   console.log(response.error) // ✅ 类型安全
 * }
 * ```
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// ============================================================================
// 辅助函数（后端使用）
// ============================================================================

/**
 * 创建成功响应
 *
 * @param data - 返回的数据
 * @param message - 可选的成功消息
 * @returns 标准成功响应对象
 *
 * @example
 * ```typescript
 * return NextResponse.json(successResponse({ id: 1, name: 'John' }))
 * return NextResponse.json(successResponse(users, '获取用户列表成功'))
 * ```
 */
export function successResponse<T>(data: T, message?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  }
}

/**
 * 创建错误响应
 *
 * @param error - 错误消息
 * @param details - 可选的详细错误信息（仅开发环境）
 * @returns 标准错误响应对象
 *
 * @example
 * ```typescript
 * return NextResponse.json(
 *   errorResponse('用户不存在'),
 *   { status: 404 }
 * )
 *
 * // 带详细信息（仅开发环境）
 * return NextResponse.json(
 *   errorResponse('验证失败', validationErrors),
 *   { status: 400 }
 * )
 * ```
 */
export function errorResponse(error: string, details?: unknown): ApiErrorResponse {
  const response: ApiErrorResponse = {
    success: false,
    error,
  }

  // 仅在开发环境包含详细错误信息
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details
  }

  return response
}

// ============================================================================
// 类型守卫（前端使用）
// ============================================================================

/**
 * 检查响应是否为成功响应
 *
 * @param response - API 响应
 * @returns 如果是成功响应返回 true
 *
 * @example
 * ```typescript
 * const response = await GET<ApiResponse<User>>('/api/auth/me')
 *
 * if (isSuccessResponse(response)) {
 *   console.log(response.data.username) // TypeScript 知道 data 存在
 * } else {
 *   console.error(response.error) // TypeScript 知道 error 存在
 * }
 * ```
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true
}

/**
 * 检查响应是否为错误响应
 *
 * @param response - API 响应
 * @returns 如果是错误响应返回 true
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false
}

// ============================================================================
// 常用响应示例
// ============================================================================

/**
 * 分页数据响应类型
 */
export interface PaginatedData<T> {
  /** 数据列表 */
  items: T[]
  /** 总数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
  /** 总页数 */
  totalPages: number
}

/**
 * 创建分页响应
 *
 * @example
 * ```typescript
 * return NextResponse.json(
 *   successResponse(paginatedResponse(tasks, 100, 1, 10))
 * )
 * ```
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedData<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ============================================================================
// HTTP 状态码常量
// ============================================================================

/**
 * 常用 HTTP 状态码
 */
export const HttpStatus = {
  /** 200 - 成功 */
  OK: 200,
  /** 201 - 创建成功 */
  CREATED: 201,
  /** 204 - 无内容（删除成功） */
  NO_CONTENT: 204,

  /** 400 - 请求参数错误 */
  BAD_REQUEST: 400,
  /** 401 - 未授权（未登录） */
  UNAUTHORIZED: 401,
  /** 403 - 禁止访问（无权限） */
  FORBIDDEN: 403,
  /** 404 - 未找到 */
  NOT_FOUND: 404,
  /** 409 - 冲突（如用户名已存在） */
  CONFLICT: 409,

  /** 500 - 服务器内部错误 */
  INTERNAL_SERVER_ERROR: 500,
  /** 503 - 服务不可用 */
  SERVICE_UNAVAILABLE: 503,
} as const

// ============================================================================
// 导出类型
// ============================================================================

/** HTTP 状态码类型 */
export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus]
