/**
 * Fetch with retry logic for handling transient network errors
 * Implements exponential backoff strategy
 */

interface FetchRetryOptions extends RequestInit {
  retries?: number
  retryDelay?: number
  timeout?: number
  onRetry?: (attempt: number, error: Error) => void
}

const isRetryableError = (error: Error): boolean => {
  const retryableErrors = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EPIPE',
    'ENOTFOUND',
    'EAI_AGAIN',
  ]

  return retryableErrors.some((code) => error.message.includes(code))
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 10000,
    onRetry,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry if it's not a retryable error or if we're out of retries
      if (!isRetryableError(lastError) || attempt === retries) {
        throw lastError
      }

      // Calculate exponential backoff delay
      const delay = retryDelay * Math.pow(2, attempt)

      if (onRetry) {
        onRetry(attempt + 1, lastError)
      }

      // Wait before retrying
      await sleep(delay)
    }
  }

  throw lastError || new Error('Fetch failed after retries')
}