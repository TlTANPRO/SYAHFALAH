// app/api/kpis/route.ts
// Server-side list + search + filter for owner/kpi page.
// Reads from the `kpis` view (kpi_definitions ⊕ kpi_targets ⊕ kpi_actuals).
// JWT cookie verify (same pattern as /api/users).

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
    if (payload.role !== 'owner' && payload.role !== 'kepala_kantor') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const url = req.nextUrl
    const q = url.searchParams.get('q')?.trim()
    const division = url.searchParams.get('division') || 'all'
    const period = url.searchParams.get('period')?.trim() || ''
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 25, 100)
    const offset = (page - 1) * pageSize

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceClient
      .from('kpis')
      .select(
        'id, code, name, level, unit, division_id, baseline_target_value, actual_value, progress, status, period',
        { count: 'exact' }
      )
      .order('progress', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (division !== 'all') query = query.eq('division_id', division)
    if (period) query = query.eq('period', period)
    if (q) {
      // search by kpi_definition code OR name
      query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%`)
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
