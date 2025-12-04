/**
 * Type-Safe API Client with Auto 401 Handling
 *
 * Simple, type-safe HTTP client wrapper around native fetch API.
 * Automatically handles authentication errors by clearing cookies and redirecting.
 *
 * IMPORTANT: All API responses follow the ApiResponse<T> format defined in @/lib/api-response
 * - Success: { success: true, data: T, message?: string }
 * - Error: { success: false, error: string, details?: unknown }
 *
 * @example
 * ```typescript
 * import { GET, POST, PUT, PATCH, DELETE } from '@/lib/api-client'
 * import type { ApiResponse } from '@/lib/api-response'
 *
 * // GET request - returns ApiResponse<T>
 * const response = await GET<ApiResponse<UserData>>('/api/auth/me')
 * if (response.success) {
 *   console.log(response.data.username)  // Type-safe access to data
 * } else {
 *   console.error(response.error)  // Type-safe access to error
 * }
 *
 * // POST with body - returns ApiResponse<T>
 * const taskResponse = await POST<ApiResponse<Task>>('/api/tasks', {
 *   type: 'video-motion',
 *   config: { ... }
 * })
 * if (taskResponse.success) {
 *   console.log(taskResponse.data.id)
 * }
 *
 * // PUT with body
 * const updated = await PUT<ApiResponse<Task>>(`/api/tasks/${id}`, { status: 'completed' })
 *
 * // DELETE (no data returned, only success/error)
 * const result = await DELETE<ApiResponse<void>>(`/api/tasks/${id}`)
 * if (result.success) {
 *   console.log('Task deleted')
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Request configuration options
 */
export interface ApiClientConfig extends Omit<RequestInit, 'method' | 'body'> {
  /**
   * Query parameters to append to URL
   * @example { page: 1, limit: 10 } → ?page=1&limit=10
   */
  params?: Record<string, string | number | boolean | undefined | null>

  /**
   * Timeout in milliseconds (0 = no timeout)
   * @default 30000 (30 seconds)
   */
  timeout?: number

  /**
   * Skip 401 auto-redirect (for special cases like login endpoints)
   * @default false
   */
  skipAuthRedirect?: boolean
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(public status: number, public statusText: string, public body?: unknown) {
    super(`HTTP ${status}: ${statusText}`)
    this.name = 'ApiError'
  }
}

// ============================================================================
// Cookie Management
// ============================================================================

/**
 * Clear all cookies (used on 401 to ensure clean logout)
 */
function clearAllCookies(): void {
  // Get all cookies
  const cookies = document.cookie.split(';')

  // Clear each cookie
  cookies.forEach((cookie) => {
    const eqPos = cookie.indexOf('=')
    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()

    if (name) {
      // Clear with different domain/path combinations to ensure removal
      const domain = window.location.hostname
      const expireDate = 'Thu, 01 Jan 1970 00:00:00 UTC'

      // Try multiple combinations to ensure cookie deletion
      document.cookie = `${name}=; expires=${expireDate}; path=/; domain=${domain};`
      document.cookie = `${name}=; expires=${expireDate}; path=/;`
      document.cookie = `${name}=; expires=${expireDate};`
    }
  })
}

/**
 * Handle 401 Unauthorized response
 */
function handle401Unauthorized(): void {
  if (typeof window === 'undefined') {
    // Server-side: just log (shouldn't happen with client-side only usage)
    console.warn('[api-client] 401 Unauthorized on server-side')
    return
  }

  console.warn('[api-client] 401 Unauthorized - clearing cookies and redirecting to /login')
  clearAllCookies()
  window.location.href = '/login'
}

// ============================================================================
// Core Request Function
// ============================================================================

/**
 * Build URL with query parameters
 */
function buildUrl(url: string, params?: ApiClientConfig['params']): string {
  if (!params) return url

  const urlObj = new URL(url, window.location.origin)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlObj.searchParams.append(key, String(value))
    }
  })

  return urlObj.pathname + urlObj.search
}

/**
 * Fetch with timeout support using AbortController
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  if (timeoutMs <= 0) {
    return fetch(url, init)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Core request function
 */
async function request(
  method: string,
  url: string,
  body?: unknown,
  config?: ApiClientConfig
): Promise<Response> {
  // Build URL with query params
  const fullUrl = buildUrl(url, config?.params)

  // Build headers
  const headers = new Headers(config?.headers)
  if (!headers.has('Content-Type') && body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  // Build request body
  let requestBody: BodyInit | undefined
  if (body !== undefined) {
    if (body instanceof FormData || body instanceof Blob) {
      requestBody = body
      // Remove Content-Type for FormData (browser sets boundary automatically)
      headers.delete('Content-Type')
    } else if (typeof body === 'string') {
      requestBody = body
    } else {
      requestBody = JSON.stringify(body)
    }
  }

  // Build fetch init
  const init: RequestInit = {
    method,
    headers,
    body: requestBody,
    credentials: config?.credentials ?? 'same-origin',
    cache: config?.cache,
    redirect: config?.redirect,
    referrer: config?.referrer,
    referrerPolicy: config?.referrerPolicy,
    integrity: config?.integrity,
    keepalive: config?.keepalive,
    mode: config?.mode,
  }

  try {
    // Execute fetch with timeout
    const timeout = config?.timeout ?? 30000
    const response = await fetchWithTimeout(fullUrl, init, timeout)

    // Handle 401 Unauthorized
    if (response.status === 401 && !config?.skipAuthRedirect) {
      handle401Unauthorized()
      // Still return the response for any cleanup logic
      return response
    }

    // Handle HTTP errors (4xx, 5xx)
    if (!response.ok) {
      let errorBody: unknown
      const contentType = response.headers.get('content-type')

      try {
        if (contentType?.includes('application/json')) {
          errorBody = await response.json()
        } else {
          errorBody = await response.text()
        }
      } catch {
        errorBody = null
      }

      throw new ApiError(response.status, response.statusText, errorBody)
    }

    return response
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error
    }

    // Handle AbortController timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${config?.timeout ?? 30000}ms`)
    }

    // Re-throw other errors
    throw error
  }
}

/**
 * Parse JSON response safely
 */
async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()

  // Handle empty response
  if (!text) {
    return undefined as T
  }

  try {
    return JSON.parse(text) as T
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error}`)
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * GET request
 *
 * @example
 * ```typescript
 * import type { ApiResponse } from '@/lib/api-response'
 *
 * const response = await GET<ApiResponse<User>>('/api/auth/me')
 * if (response.success) {
 *   console.log(response.data.username)
 * }
 *
 * const tasksResponse = await GET<ApiResponse<{ tasks: Task[] }>>('/api/tasks', {
 *   params: { status: 'pending' }
 * })
 * ```
 */
export async function GET<T = unknown>(url: string, config?: ApiClientConfig): Promise<T> {
  const response = await request('GET', url, undefined, config)
  return parseJson<T>(response)
}

/**
 * POST request
 *
 * @example
 * ```typescript
 * import type { ApiResponse } from '@/lib/api-response'
 *
 * const response = await POST<ApiResponse<Task>>('/api/tasks', {
 *   type: 'video-motion',
 *   config: { duration: 5 }
 * })
 * if (response.success) {
 *   console.log(response.data.id)
 * }
 * ```
 */
export async function POST<T = unknown>(
  url: string,
  body?: unknown,
  config?: ApiClientConfig
): Promise<T> {
  const response = await request('POST', url, body, config)
  return parseJson<T>(response)
}

/**
 * PUT request
 *
 * @example
 * ```typescript
 * import type { ApiResponse } from '@/lib/api-response'
 *
 * const response = await PUT<ApiResponse<Task>>(`/api/tasks/${id}`, {
 *   status: 'completed'
 * })
 * if (response.success) {
 *   console.log(response.data)
 * }
 * ```
 */
export async function PUT<T = unknown>(
  url: string,
  body?: unknown,
  config?: ApiClientConfig
): Promise<T> {
  const response = await request('PUT', url, body, config)
  return parseJson<T>(response)
}

/**
 * PATCH request
 *
 * @example
 * ```typescript
 * import type { ApiResponse } from '@/lib/api-response'
 *
 * const response = await PATCH<ApiResponse<Task>>(`/api/tasks/${id}`, {
 *   status: 'processing'
 * })
 * if (response.success) {
 *   console.log(response.data)
 * }
 * ```
 */
export async function PATCH<T = unknown>(
  url: string,
  body?: unknown,
  config?: ApiClientConfig
): Promise<T> {
  const response = await request('PATCH', url, body, config)
  return parseJson<T>(response)
}

/**
 * DELETE request
 *
 * @example
 * ```typescript
 * import type { ApiResponse } from '@/lib/api-response'
 *
 * const response = await DELETE<ApiResponse<void>>(`/api/tasks/${id}`)
 * if (response.success) {
 *   console.log('Deleted successfully')
 * }
 * ```
 */
export async function DELETE<T = unknown>(url: string, config?: ApiClientConfig): Promise<T> {
  const response = await request('DELETE', url, undefined, config)
  return parseJson<T>(response)
}
