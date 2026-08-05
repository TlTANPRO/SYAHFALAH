// app/api/notifications/route.ts
// Server-side proxy to fetch notifications for the authenticated user.
// Used by client components (NotificationBell, useDashboardData, etc.) to
// avoid 401 errors caused by migration 010 revoking anon from tables.
//
// Auth: relies on the user's session cookie set by /api/auth/pin. The user
// is read from the session cookie via cookies() and looked up in users table.
// The query then runs as service_role on behalf of that user, returning
// only notifications for that user_id.
//
// Methods:
//   GET /api/notifications?limit=20  -> 200 JSON array

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'sb-access-token' // set by /api/auth/pin (matches existing pattern)

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 20, 100)

    // Resolve current user from session cookie
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(COOKIE_NAME)?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    // Use a regular (anon-key) client to verify the JWT and get the user
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: userData, error: userErr } = await anonClient.auth.getUser(accessToken)
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    }
    const authUserId = userData.user.id

    // Look up the user's profile (which has the actual user_id matching notifications.user_id)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile, error: profileErr } = await serviceClient
      .from('users')
      .select('id')
      .eq('auth_id', authUserId)
      .single()
    if (profileErr || !profile) {
      return NextResponse.json({ error: 'profile not found' }, { status: 404 })
    }

    // Fetch notifications via service_role
    const { data, error } = await serviceClient
      .from('notifications')
      .select('id, type, title, message, is_read, read_at, priority, action_url, reference_id, reference_type, channels, sent_channels, created_at, approval_status, approval_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

// PATCH endpoint to mark notifications as read or set approval_status
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(COOKIE_NAME)?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: userData } = await anonClient.auth.getUser(accessToken)
    if (!userData?.user) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await serviceClient
      .from('users')
      .select('id')
      .eq('auth_id', userData.user.id)
      .single()
    if (!profile) return NextResponse.json({ error: 'profile not found' }, { status: 404 })

    const body = await req.json()
    const { id, is_read, approval_status } = body as { id?: string; is_read?: boolean; approval_status?: 'approved' | 'rejected' }

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (typeof is_read === 'boolean') {
      updates.is_read = is_read
      updates.read_at = is_read ? new Date().toISOString() : null
    }
    if (approval_status) {
      updates.approval_status = approval_status
      updates.approval_at = new Date().toISOString()
    }
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'no fields' }, { status: 400 })

    const { data, error } = await serviceClient
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .eq('user_id', profile.id)
      .select('id, is_read, read_at, approval_status, approval_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
