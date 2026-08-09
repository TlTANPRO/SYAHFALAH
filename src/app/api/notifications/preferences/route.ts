// app/api/notifications/preferences/route.ts
// GET + PATCH user notification channel preferences.
// Stores in users.notification_prefs jsonb column.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { verifyAccessToken } from '@/lib/auth/jwt'

// Allowed preference keys (whitelist for security — prevent arbitrary jsonb keys)
const ALLOWED_KEYS = new Set([
  'whatsapp_group',
  'email',
  'desktop_push',
  'sound_enabled',
])

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null
  const payload = await verifyAccessToken(token)
  return payload?.userId ?? null
}

export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const sb = getSupabase()
    const { data, error } = await sb
      .from('users')
      .select('notification_prefs')
      .eq('id', userId)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ prefs: data?.notification_prefs ?? {} })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { key, value } = body ?? {}

    if (typeof key !== 'string' || !ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: `Invalid key. Allowed: ${[...ALLOWED_KEYS].join(', ')}` }, { status: 400 })
    }
    if (typeof value !== 'boolean') {
      return NextResponse.json({ error: 'value must be boolean' }, { status: 400 })
    }

    const sb = getSupabase()
    // Atomic jsonb set: update only the specific key
    const { data, error } = await sb.rpc('update_notification_pref', {
      p_user_id: userId,
      p_key: key,
      p_value: value,
    }).select().single()

    if (error) {
      // Fallback if RPC doesn't exist: use raw update with jsonb_set
      // Get current prefs, merge, update
      const { data: current, error: readErr } = await sb
        .from('users')
        .select('notification_prefs')
        .eq('id', userId)
        .single()
      if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })

      const merged = { ...(current?.notification_prefs ?? {}), [key]: value }
      const { error: updateErr } = await sb
        .from('users')
        .update({ notification_prefs: merged, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

      return NextResponse.json({ prefs: merged })
    }

    return NextResponse.json({ prefs: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
