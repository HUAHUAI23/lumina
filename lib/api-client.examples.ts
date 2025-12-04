/**
 * API Client Usage Examples
 *
 * This file demonstrates how to use the new type-safe API client
 * throughout the lumina application.
 */

import { type ApiClientConfig, ApiError, DELETE, GET, PATCH, POST, PUT } from '@/lib/api-client'

// ============================================================================
// Type Definitions (examples - adjust based on your actual types)
// ============================================================================

interface User {
  id: number
  username: string
  email: string | null
  avatar: string | null
  credits: number
}

interface Task {
  id: string
  userId: number
  type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  config: Record<string, unknown>
  result?: unknown
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// ============================================================================
// Basic Usage Examples
// ============================================================================

/**
 * Example 1: Simple GET request
 */
async function fetchCurrentUser() {
  try {
    const response = await GET<ApiResponse<User>>('/api/auth/me')

    if (response.success && response.data) {
      console.log('User:', response.data)
      return response.data
    }
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error ${error.status}:`, error.body)
    } else {
      console.error('Unexpected error:', error)
    }
  }
}

/**
 * Example 2: GET with query parameters
 */
async function fetchTasks(status?: string, limit = 10) {
  try {
    const tasks = await GET<Task[]>('/api/tasks', {
      params: {
        status,
        limit,
        page: 1,
      },
    })

    console.log('Tasks:', tasks)
    return tasks
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Failed to fetch tasks: ${error.message}`)
    }
    throw error
  }
}

/**
 * Example 3: POST request with body
 */
async function createTask(type: string, config: Record<string, unknown>) {
  try {
    const task = await POST<Task>('/api/tasks', {
      type,
      config,
    })

    console.log('Created task:', task)
    return task
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Failed to create task: ${error.message}`, error.body)
    }
    throw error
  }
}

/**
 * Example 4: PUT request to update resource
 */
async function updateTask(taskId: string, updates: Partial<Task>) {
  try {
    const updated = await PUT<Task>(`/api/tasks/${taskId}`, updates)
    console.log('Updated task:', updated)
    return updated
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Failed to update task: ${error.message}`)
    }
    throw error
  }
}

/**
 * Example 5: PATCH request for partial updates
 */
async function updateTaskStatus(taskId: string, status: Task['status']) {
  try {
    const updated = await PATCH<Task>(`/api/tasks/${taskId}`, { status })
    console.log('Status updated:', updated)
    return updated
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Failed to update status: ${error.message}`)
    }
    throw error
  }
}

/**
 * Example 6: DELETE request
 */
async function deleteTask(taskId: string) {
  try {
    await DELETE(`/api/tasks/${taskId}`)
    console.log('Task deleted')
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Failed to delete task: ${error.message}`)
    }
    throw error
  }
}

// ============================================================================
// Advanced Usage Examples
// ============================================================================

/**
 * Example 7: Custom timeout
 */
async function fetchWithCustomTimeout() {
  try {
    const result = await GET('/api/long-running-task', {
      timeout: 60000, // 60 seconds instead of default 30s
    })
    return result
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('Request timed out after 60 seconds')
    }
    throw error
  }
}

/**
 * Example 8: FormData upload
 */
async function uploadFile(file: File) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'image')

    const result = await POST('/api/upload', formData)
    console.log('Upload result:', result)
    return result
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Upload failed: ${error.message}`)
    }
    throw error
  }
}

/**
 * Example 9: Skip auto 401 redirect (for login endpoint)
 */
async function login(username: string, password: string) {
  try {
    const result = await POST<ApiResponse<{ token: string }>>(
      '/api/auth/login',
      {
        username,
        password,
      },
      {
        skipAuthRedirect: true, // Don't redirect on 401, we want to show error
      }
    )

    return result
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Handle invalid credentials
      console.error('Invalid username or password')
    }
    throw error
  }
}

/**
 * Example 10: Custom headers
 */
async function fetchWithCustomHeaders() {
  try {
    const result = await GET('/api/data', {
      headers: {
        'X-Custom-Header': 'value',
        'Accept-Language': 'zh-CN',
      },
    })
    return result
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Request failed: ${error.message}`)
    }
    throw error
  }
}

// ============================================================================
// React Component Example
// ============================================================================

/**
 * Example 11: Usage in React component
 */
export function UserProfileExample() {
  // In a real component, you would use React hooks
  const handleFetchUser = async () => {
    try {
      const user = await fetchCurrentUser()
      // Update state, etc.
    } catch (error) {
      // Handle error
    }
  }

  const handleCreateTask = async () => {
    try {
      const task = await createTask('video-motion', {
        duration: 5,
        style: 'cinematic',
      })
      // Update state, show success message, etc.
    } catch (error) {
      // Handle error, show error message, etc.
    }
  }

  // ... component JSX
}

// ============================================================================
// Migration from Raw fetch()
// ============================================================================

/**
 * BEFORE: Using raw fetch
 */
async function oldWayFetchUser() {
  const response = await fetch('/api/auth/me')
  const data = await response.json()
  if (data.success) {
    return data.user
  }
}

/**
 * AFTER: Using API client
 */
async function newWayFetchUser() {
  const response = await GET<ApiResponse<User>>('/api/auth/me')
  if (response.success && response.data) {
    return response.data
  }
}

/**
 * Benefits of new approach:
 * - Type safety: TypeScript knows the response shape
 * - Auto 401 handling: No need to manually check and redirect
 * - Error handling: Consistent ApiError class
 * - Query params: Easy to add with params object
 * - Timeout: Built-in support
 * - Less boilerplate: No need to call .json() or check response.ok
 */
