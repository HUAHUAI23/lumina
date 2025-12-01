/**
 * GET /api/auth/config
 * Returns public authentication configuration
 */

import { NextResponse } from 'next/server'

import { env } from '@/lib/env'

export async function GET() {
  return NextResponse.json({
    passwordAuth: env.ENABLE_PASSWORD_AUTH,
    githubAuth: env.ENABLE_GITHUB_AUTH,
    googleAuth: env.ENABLE_GOOGLE_AUTH,
  })
}