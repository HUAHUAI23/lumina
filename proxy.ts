/**
 * Authentication Proxy (Next.js 16)
 *
 * Important Security Note (2025):
 * This proxy provides the FIRST layer of defense, but due to CVE-2025-29927,
 * proxy alone is NOT sufficient. All sensitive operations must also verify
 * authentication at the Data Access Layer.
 *
 * Proxy responsibilities:
 * - Session refresh
 * - Basic authentication checks
 * - Redirect unauthenticated users
 */

import { NextRequest, NextResponse } from 'next/server'

import { decrypt, updateSession } from './lib/auth/session'

// Simplified matcher - match everything except static files
export const config = {
  matcher: [
    // Match dashboard and other protected routes
    '/dashboard/:path*',
    '/video-studio/:path*',
    '/image-studio/:path*',
    '/assets/:path*',
    '/billing/:path*',
    '/settings/:path*',
  ],
}

// Proxy function - handles authentication for all matched routes
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check session
  const cookie = request.cookies.get('lumina_session')?.value
  const session = cookie ? await decrypt(cookie) : null

  // Redirect to login if not authenticated
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Update session expiry (keep user logged in)
  return updateSession(request)
}
