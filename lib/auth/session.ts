/**
 * JWT Session Management using jose
 *
 * Based on Next.js 2025 best practices:
 * - Stateless JWT sessions stored in HTTP-only cookies
 * - Secure, signed tokens prevent XSS and tampering
 * - Session verification at every data access point (Data Access Layer pattern)
 */

import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { env } from '../env'

const SESSION_COOKIE_NAME = 'lumina_session'
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

// Convert string secret to Uint8Array for jose
const secretKey = new TextEncoder().encode(env.AUTH_SECRET)

export interface SessionPayload {
  userId: number
  username: string
  email?: string
  expiresAt: Date
}

/**
 * Encrypt and sign a session payload into a JWT
 */
export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload, expiresAt: payload.expiresAt.toISOString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .sign(secretKey)
}

/**
 * Decrypt and verify a JWT session token
 */
export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    })

    return {
      userId: payload.userId as number,
      username: payload.username as string,
      email: payload.email as string | undefined,
      expiresAt: new Date(payload.expiresAt as string),
    }
  } catch (error) {
    console.error('Failed to verify session:', error)
    return null
  }
}

/**
 * Create a new session and set the session cookie
 */
export async function createSession(userId: number, username: string, email?: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION)
  const session = await encrypt({ userId, username, email, expiresAt })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })

  return session
}

/**
 * Get the current session from cookies
 * Used in Server Components and Server Actions
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  return decrypt(sessionCookie.value)
}

/**
 * Delete the session cookie (logout)
 */
export async function deleteSession() {
  const cookieStore = await cookies()

  // Set cookie with past expiration date to ensure deletion
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    expires: new Date(0), // Set to epoch time to expire immediately
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

/**
 * Update the session expiry time (refresh)
 * Call this periodically to keep users logged in
 */
export async function updateSession(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!sessionCookie) {
    return
  }

  const parsed = await decrypt(sessionCookie)

  if (!parsed) {
    return
  }

  // Extend session
  parsed.expiresAt = new Date(Date.now() + SESSION_DURATION)
  const res = NextResponse.next()

  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: await encrypt(parsed),
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    expires: parsed.expiresAt,
    sameSite: 'lax',
    path: '/',
  })

  return res
}
