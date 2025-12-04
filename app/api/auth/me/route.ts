/**
 * GET /api/auth/me
 * Get current user information including credits balance
 */

import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { accounts } from '@/db/schema'
import { getCurrentSession } from '@/lib/auth/dal'
import { getUserById } from '@/lib/auth/service'

export async function GET() {
  try {
    const session = await getCurrentSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserById(session.userId)

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Get user's account balance
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.userId, user.id),
    })

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        credits: account?.balance || 0,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get user information' }, { status: 500 })
  }
}