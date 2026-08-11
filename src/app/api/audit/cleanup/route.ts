// src/app/api/audit/cleanup/route.ts
// DELETE audit log entries (owner-only).
// Body: { before: 'YYYY-MM-DD' } or { ids: [...] } or { all: true } to clear all.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { before, ids, all } = body as { before?: string; ids?: string[]; all?: boolean }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Build query
    let query = serviceClient.from('api_audit_log').delete({ count: 'exact' })
    let descriptor = 'unknown'

    if (ids && Array.isArray(ids) && ids.length > 0) {
      query = query.in('id', ids)
      descriptor = `${ids.length} specific IDs`
    } else if (before) {
      query = query.lt('created_at', `${before}T23:59:59.999Z`)
      descriptor = `entries before ${before}`
    } else if (all) {
      // No filter — clear all
      descriptor = 'ALL entries (explicit all=true)'
    } else {
      return NextResponse.json({ error: 'specify before, ids, or all=true' }, { status: 400 })
    }

    // Execute
    const result = await query
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })

    return NextResponse.json({ deleted: result.count ?? 0, scope: descriptor })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}