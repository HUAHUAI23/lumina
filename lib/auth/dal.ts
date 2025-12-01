/**
 * Data Access Layer (DAL) for Authentication
 *
 * Critical Security Pattern (2025):
 * Due to CVE-2025-29927, middleware is no longer considered a safe perimeter defense.
 * All sensitive data access MUST verify authentication at the point of access.
 *
 * This DAL implements the "proximity principle" - authentication checks are as close
 * as possible to where data is accessed.
 *
 * References:
 * - https://nextjs.org/docs/pages/guides/authentication
 * - https://medium.com/@franciscomoretti/next-js-authentication-best-practices-6897dad3a170
 */

import { cache } from 'react'

import 'server-only'

import { getSession } from './session'

/**
 * Verify and return the current user session
 * Cached per request to avoid redundant session checks
 *
 * @throws {Error} If user is not authenticated
 */
export const verifySession = cache(async () => {
  const session = await getSession()

  if (!session) {
    throw new Error('Unauthorized: No valid session')
  }

  // Verify session hasn't expired
  if (new Date() > session.expiresAt) {
    throw new Error('Unauthorized: Session expired')
  }

  return {
    isAuth: true,
    userId: session.userId,
    username: session.username,
    email: session.email,
  }
})

/**
 * Get the current user ID (for authenticated requests only)
 *
 * @throws {Error} If user is not authenticated
 */
export const getCurrentUserId = cache(async () => {
  const session = await verifySession()
  return session.userId
})

/**
 * Check if the current user is authenticated (without throwing)
 *
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export const isAuthenticated = cache(async () => {
  try {
    await verifySession()
    return true
  } catch {
    return false
  }
})

/**
 * Get the current session (nullable, doesn't throw)
 *
 * @returns {Promise<SessionData | null>} Session data or null
 */
export const getCurrentSession = cache(async () => {
  try {
    return await verifySession()
  } catch {
    return null
  }
})
