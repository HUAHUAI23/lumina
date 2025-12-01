/**
 * POST /api/auth/login
 * Username/Password Login
 */

import { NextRequest, NextResponse } from 'next/server'

import { loginWithPassword } from '@/lib/auth/service'
import { createSession } from '@/lib/auth/session'
import { loginWithPasswordSchema } from '@/lib/validations/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { usernameOrEmail, password } = loginWithPasswordSchema.parse(body)

    // Authenticate user
    const user = await loginWithPassword(usernameOrEmail, password)

    // Create session
    await createSession(user.userId, user.username, user.email)

    return NextResponse.json({
      success: true,
      user: {
        id: user.userId,
        username: user.username,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Login error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 })
    }

    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 })
  }
}