// src/app/api/audit/route.ts
// Reads from public.api_audit_log (LIVE table — 6+ rows from PATCH tests).
// Role gate: payload.role must be 'owner' OR 'kepala_kantor'.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALLOWED_ROLES = new Set(['owner', 'kepala_kantor'])

type DateRange = 'all' | '7d' | '30d'

function resolveDateRange(range: string | null): DateRange {
  if (range === '7d' || range === '30d' || range === 'all') return range
  return 'all'
}

function rangeStart(range: DateRange): string | null {
  if (range === 'all') return null
  const days = range === '7d' ? 7 : 30
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export async function GET(req: NextRequest) {
  try {
    // 1. Auth
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    const payload = await verifyAccessToken(accessToken)
    if (!payload) {
      return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    }
    if (!ALLOWED_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // 2. Parse params
    const url = req.nextUrl
    const q = url.searchParams.get('q')?.trim() ?? ''
    const action = url.searchParams.get('action')?.trim() ?? ''
    const tableName = url.searchParams.get('table')?.trim() ?? ''
    const userId = url.searchParams.get('user_id')?.trim() ?? ''
    const range = resolveDateRange(url.searchParams.get('range'))
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 25, 100)
    const offset = (page - 1) * pageSize

    // 3. Service-role client
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceClient
      .from('api_audit_log')
      .select('id, user_id, table_name, row_id, action, before, after, ip_address, user_agent, created_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (action) query = query.eq('action', action)
    if (tableName) query = query.eq('table_name', tableName)
    if (userId) query = query.eq('user_id', userId)
    const start = rangeStart(range)
    if (start) query = query.gte('created_at', start)
    if (q) {
      // Free-text search across table_name / action. row_id is uuid;
      // users wanting row-specific search should use the row_id param.
      query = query.or(
        `table_name.ilike.%${q}%,action.ilike.%${q}%`
      )
    }

    const { data, error, count } = await query
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json({ data: [], total: 0, page, pageSize })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'internal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
