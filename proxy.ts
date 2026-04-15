import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth-constants'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const PUBLIC_FILE = /\.[^/]+$/

// Public routes that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null

  // No tokens at all → redirect to login
  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Validate the access token
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  if (accessToken) {
    const { data } = await authClient.auth.getUser(accessToken)
    if (data.user) {
      // Token is valid — pass through
      return NextResponse.next()
    }
  }

  // Access token invalid/expired — try to refresh
  if (!refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: refreshData, error: refreshError } = await authClient.auth.refreshSession({
    refresh_token: refreshToken,
  })

  if (refreshError || !refreshData.session) {
    // Refresh failed — clear cookies and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(ACCESS_TOKEN_COOKIE)
    response.cookies.delete(REFRESH_TOKEN_COOKIE)
    return response
  }

  // Refresh succeeded — continue the request and set new tokens in response cookies
  const response = NextResponse.next()
  const newSession = refreshData.session

  const cookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    path: '/',
  }

  response.cookies.set(ACCESS_TOKEN_COOKIE, newSession.access_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  response.cookies.set(REFRESH_TOKEN_COOKIE, newSession.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
