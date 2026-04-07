import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createStatelessSupabase } from '@/lib/auth'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth-constants'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = createStatelessSupabase()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify user exists in app_users and is active
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('id, email, full_name, role, is_active')
      .eq('id', data.user.id)
      .maybeSingle()

    if (appUserError || !appUser) {
      return NextResponse.json(
        { error: 'User not authorized for this application' },
        { status: 403 }
      )
    }

    if (!appUser.is_active) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      )
    }

    // Set cookies
    const cookieStore = await cookies()
    cookieStore.set(ACCESS_TOKEN_COOKIE, data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    cookieStore.set(REFRESH_TOKEN_COOKIE, data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    return NextResponse.json({
      success: true,
      user: {
        id: appUser.id,
        email: appUser.email,
        full_name: appUser.full_name,
        role: appUser.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
