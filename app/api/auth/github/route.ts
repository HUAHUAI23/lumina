/**
 * GET /api/auth/github
 * Initiate GitHub OAuth flow
 */

import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'

export async function GET(request: NextRequest) {
  try {
    const { GITHUB_CLIENT_ID } = env

    if (!GITHUB_CLIENT_ID) {
      return NextResponse.json({ success: false, error: 'GitHub OAuth is not configured' }, { status: 500 })
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID()

    // Build GitHub OAuth URL
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize')
    githubAuthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID)
    githubAuthUrl.searchParams.set('redirect_uri', `${request.nextUrl.origin}/api/auth/github/callback`)
    githubAuthUrl.searchParams.set('scope', 'read:user user:email')
    githubAuthUrl.searchParams.set('state', state)

    // Store state in cookie for verification in callback
    const response = NextResponse.redirect(githubAuthUrl.toString())
    response.cookies.set('github_oauth_state', state, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return response
  } catch (error) {
    console.error('GitHub OAuth initiation error:', error)
    return NextResponse.json({ success: false, error: 'Failed to initiate GitHub OAuth' }, { status: 500 })
  }
}
