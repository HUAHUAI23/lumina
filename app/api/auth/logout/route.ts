/**
 * POST /api/auth/logout
 * User Logout
 */

import { NextResponse } from 'next/server'

import { deleteSession } from '@/lib/auth/session'

export async function POST() {
  try {
    // Delete session cookie server-side
    await deleteSession()

    // Create response and ensure cookie is deleted in response headers
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    // Explicitly set cookie deletion in response
    response.cookies.set('lumina_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ success: false, error: 'Failed to logout' }, { status: 500 })
  }
}