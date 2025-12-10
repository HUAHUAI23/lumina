/**
 * POST /api/auth/check
 * Check if username/email exists (for unified login/register flow)
 */

import { eq,or } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { users } from '@/db/schema'

const checkSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { usernameOrEmail } = checkSchema.parse(body)

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: or(eq(users.username, usernameOrEmail), eq(users.email, usernameOrEmail)),
      columns: {
        id: true,
        username: true,
        email: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        exists: !!existingUser,
        needsPassword: !!existingUser, // If exists, needs password to login
        needsRegistration: !existingUser, // If not exists, needs to register
      },
    })
  } catch (error) {
    console.error('Check user error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 })
    }

    return NextResponse.json({ success: false, error: 'Failed to check user' }, { status: 500 })
  }
}