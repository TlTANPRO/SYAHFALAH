// src/app/api/notifications/route.ts
// Phase 3-5 — Notification feed for current user.
// GET: returns user's notifications (newest first), paginated by created_at.
// POST: marks notification(s) read; optionally marks-all.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const url = req.nextUrl
    const unread = url.searchParams.get('unread') === '1'
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 50, 100)
    const offset = (page - 1) * pageSize

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    let q = sb
      .from('notifications')
      .select('id, title, body, link, is_read, read_at, payload, created_at', { count: 'exact' })
      .eq('user_id', payload.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
    if (unread) q = q.eq('is_read', false)
    const { data, error, count } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

    if (body.mark_all_read === true) {
      const { error, count } = await sb
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', payload.userId)
        .eq('is_read', false)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ marked: count ?? 'all-unread' })
    }

    // mark specific by id(s)
    const ids: string[] = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : []
    if (ids.length === 0) {
      return NextResponse.json({ error: 'ids wajib' }, { status: 400 })
    }
    const { error } = await sb
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', payload.userId)
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ marked: ids.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
