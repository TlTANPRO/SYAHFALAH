// app/api/notifications/route.ts
// Server-side proxy for client notifications query.
// Uses HS256 JWT cookie verification (matches /api/auth/pin flow).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 20, 100)

    // Verify JWT from cookie (HS256, JWT_SECRET)
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    const payload = await verifyAccessToken(accessToken)
    if (!payload) {
      return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    }
    const userId = payload.userId

    // Fetch notifications via service_role (RLS off, but explicit user_id filter)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await serviceClient
      .from('notifications')
      .select('id, type, title, message, is_read, read_at, priority, action_url, reference_id, reference_type, channels, sent_channels, created_at, approval_status, approval_at')
      .eq('user_id', userId)
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

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    const userId = payload.userId

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json()
    const { id, is_read, approval_status } = body as {
      id?: string
      is_read?: boolean
      approval_status?: 'approved' | 'rejected'
    }

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
      .eq('user_id', userId)
      .select('id, is_read, read_at, approval_status, approval_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
