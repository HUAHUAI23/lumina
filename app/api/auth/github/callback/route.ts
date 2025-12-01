/**
 * GET /api/auth/github/callback
 * GitHub OAuth callback handler
 */

import { NextRequest, NextResponse } from 'next/server'

import { findOrCreateGithubUser } from '@/lib/auth/service'
import { createSession } from '@/lib/auth/session'
import { env } from '@/lib/env'
import { fetchWithRetry } from '@/lib/utils/fetch-retry'

interface GitHubUserResponse {
  id: string
  login: string
  email: string | null
  avatar_url: string
  name: string | null
}

interface GitHubEmailResponse {
  email: string
  primary: boolean
  verified: boolean
  visibility: string | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    // Verify state to prevent CSRF
    const storedState = request.cookies.get('github_oauth_state')?.value

    if (!code || !state || state !== storedState) {
      return NextResponse.redirect(new URL('/login?error=invalid_oauth_state', request.url))
    }

    // Exchange code for access token (with retry logic for network errors)
    const tokenResponse = await fetchWithRetry('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
      retries: 3,
      timeout: 10000,
      onRetry: (attempt, error) => {
        console.warn(`GitHub OAuth token request retry ${attempt}/3:`, error.message)
      },
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL('/login?error=github_oauth_failed', request.url))
    }

    // Get user info from GitHub (with retry logic)
    const userResponse = await fetchWithRetry('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
      retries: 3,
      timeout: 10000,
    })

    const githubUser = (await userResponse.json()) as GitHubUserResponse

    // Get primary email if not public
    let email = githubUser.email
    if (!email) {
      const emailsResponse = await fetchWithRetry('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
        },
        retries: 3,
        timeout: 10000,
      })
      const emails = (await emailsResponse.json()) as GitHubEmailResponse[]
      const primaryEmail = emails.find((e) => e.primary && e.verified)
      email = primaryEmail?.email || null
    }

    // Find or create user
    const user = await findOrCreateGithubUser({
      id: String(githubUser.id),
      login: githubUser.login,
      email,
      avatar_url: githubUser.avatar_url,
      access_token: tokenData.access_token,
    })

    // Create session
    await createSession(user.userId, user.username, user.email)

    // Clear OAuth state cookie and redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.delete('github_oauth_state')

    return response
  } catch (error) {
    console.error('GitHub OAuth callback error:', error)
    return NextResponse.redirect(new URL('/login?error=github_auth_failed', request.url))
  }
}