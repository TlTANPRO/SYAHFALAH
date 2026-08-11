// src/app/api/notifications/route.ts
// Phase 3-5 — Notification feed for current user.
// GET: returns user's notifications (newest first), paginated by created_at.
// POST: marks notification(s) read; optionally marks-all.

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { handleList, type CrudConfig } from '@/lib/api/crud-handler'

const NOTIFICATIONS_CONFIG: CrudConfig<'notifications'> = {
  entity: 'notifications',
  table: 'notifications',
  selectFields: 'id, title, body, link, is_read, read_at, payload, created_at',
  defaultOrder: { column: 'created_at', ascending: false },
  scopeToUser: true,
  defaultPageSize: 20,
  maxPageSize: 100,
  queryFilters: {
    unread: 'is_read', // ?unread=1 maps to is_read=false (handled below)
  },
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // The "unread=1" param needs special handling: equal false instead of string '1'
  const url = req.nextUrl
  const unreadFlag = url.searchParams.get('unread') === '1'
  // Remove the param from URL searchParams before delegating to handleList
  if (unreadFlag) {
    url.searchParams.delete('unread')
  }
  const res = await handleList(req, NOTIFICATIONS_CONFIG)
  if (unreadFlag && res.ok) {
    const body = await res.clone().json()
    body.data = (body.data ?? []).filter((n: { is_read: boolean }) => !n.is_read)
    body.total = body.data.length
    return NextResponse.json(body, { status: 200, headers: res.headers })
  }
  return res
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
