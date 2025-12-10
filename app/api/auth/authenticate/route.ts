/**
 * POST /api/auth/authenticate
 * Unified authentication endpoint - handles both login and registration
 */

import { eq,or } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { users } from '@/db/schema'
import { loginWithPassword, registerUser } from '@/lib/auth/service'
import { createSession } from '@/lib/auth/session'
import { emailSchema, passwordSchema, usernameSchema } from '@/lib/validations/auth'

const authenticateSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: passwordSchema,
  // For registration
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = authenticateSchema.parse(body)

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: or(eq(users.username, data.usernameOrEmail), eq(users.email, data.usernameOrEmail)),
    })

    if (existingUser) {
      // User exists -> Login
      const user = await loginWithPassword(data.usernameOrEmail, data.password)
      await createSession(user.userId, user.username, user.email)

      return NextResponse.json({
        success: true,
        data: {
          action: 'login',
          user: {
            id: user.userId,
            username: user.username,
            email: user.email,
          },
        },
      })
    } else {
      // User doesn't exist -> Register
      if (!data.username || !data.email) {
        return NextResponse.json(
          {
            success: false,
            error: 'Username and email are required for registration',
          },
          { status: 400 }
        )
      }

      const user = await registerUser(data.username, data.email, data.password)
      await createSession(user.id, user.username, user.email || undefined)

      return NextResponse.json({
        success: true,
        data: {
          action: 'register',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        },
      })
    }
  } catch (error) {
    console.error('Authentication error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 })
    }

    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 })
    }

    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 })
  }
}