// app/api/audit-logs/route.ts
// Owner-only audit log query endpoint (Plan C Phase 1 Item 3).
// Reads from public.audit_logs table. Returns recent events filtered by
// action / table_name / user_id with paginated + total count.
//
// RLS state on live DB: 0 policies defined for audit_logs, but
// migration 010 revoked anon GRANTs. So anon can't read; authenticated
// users CAN read all rows by default. We enforce owner-only here via
// JWT + role check + service-role client (matches /api/kpis pattern).
//
// Schema (live): id, user_id (FK→users), action, table_name, record_id,
// old_data (jsonb), new_data (jsonb), ip_address (inet),
// user_agent (text), created_at (timestamptz).
//
// Out of scope (intentional): mutation triggers / write-side audit hooks.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    if (payload.role !== 'owner') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const url = req.nextUrl
    const q = url.searchParams.get('q')?.trim() ?? ''
    const action = url.searchParams.get('action')?.trim() ?? ''
    const tableName = url.searchParams.get('table')?.trim() ?? ''
    const userId = url.searchParams.get('user_id')?.trim() ?? ''
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 25, 100)
    const offset = (page - 1) * pageSize

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceClient
      .from('audit_logs')
      .select(
        'id, user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (action) query = query.eq('action', action)
    if (tableName) query = query.eq('table_name', tableName)
    if (userId) query = query.eq('user_id', userId)
    if (q) {
      // text search across action / table_name
      query = query.or(`action.ilike.%${q}%,table_name.ilike.%${q}%`)
    }

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
