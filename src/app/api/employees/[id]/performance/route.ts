// app/api/employees/[id]/performance/route.ts
// Plan C Phase 1 item 1 — Employee performance breakdown.
// Convenience wrapper around /api/performance/score?user_id=X — returns
// the score card for one user (owner + kepala_kantor only).

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    if (!['owner', 'kepala_kantor'].includes(payload.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const { id } = await ctx.params
    const base = process.env.NEXT_PUBLIC_APP_URL
    if (!base) {
      return NextResponse.json({ error: 'APP_URL not configured' }, { status: 500 })
    }

    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ')

    const res = await fetch(`${base}/api/performance/score?user_id=${encodeURIComponent(id)}`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: text || 'score fetch failed' }, { status: res.status })
    }
    const json = await res.json()
    const row = (json?.data ?? [])[0] ?? null
    return NextResponse.json({ data: row })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
