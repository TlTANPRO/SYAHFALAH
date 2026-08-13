// app/api/auth/me/route.ts
// P1 fix: Bug #3 from Mada audit - /api/auth/me was missing.
// Returns current user profile (from JWT + DB lookup).
// Used by client-side auth validation to detect stale localStorage sessions.
//
// Why this matters:
//   - The Zustand auth store persists user data to localStorage for fast hydration
//   - But it does NOT validate against the server
//   - If the JWT cookie expired but localStorage still has stale user data,
//     every fetch fires 401 storms
//   - Fix: on app mount, if localStorage has user, validate against this endpoint.
//     On 401, safeFetch clears local state + redirects to /login.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    // Fetch full profile from DB
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      // No DB access — return basic profile from JWT (still better than nothing)
      return NextResponse.json({
        id: payload.userId,
        full_name: payload.name,
        role: payload.role,
        division_id: payload.divisionId,
        position: payload.position,
      })
    }

    const sb = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await sb
      .from('users')
      .select('id, full_name, role, division_id, position, avatar_url, is_active')
      .eq('id', payload.userId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'user not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: data.id,
      full_name: data.full_name,
      role: data.role,
      division_id: data.division_id,
      position: data.position,
      avatar_url: data.avatar_url,
      is_active: data.is_active,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'internal' },
      { status: 500 }
    )
  }
}