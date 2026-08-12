// app/api/analytics/historical/route.ts
// HARD #1: Returns aggregated metrics from Supabase perf_metrics table.
// Required migration: supabase/migrations/2026-08-13_perf_metrics.sql
// Owner-only access.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'owner') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'db not configured' }, { status: 503 })
  }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const sp = req.nextUrl.searchParams
  const hours = Math.min(24, Math.max(1, Number(sp.get('hours') ?? '1')))

  // Aggregate by metric_type over window. Default 1h window.
  const sinceIso = new Date(Date.now() - hours * 3600_000).toISOString()
  const { data, error } = await sb
    .from('perf_metrics')
    .select('metric_type, entity, action, duration_ms, route, recorded_at')
    .gte('recorded_at', sinceIso)
    .order('recorded_at', { ascending: false })
    .limit(1000)

  if (error) {
    // Table may not exist yet
    if (error.code === 'PGRST205' || (error.message ?? '').includes('does not exist')) {
      return NextResponse.json({
        error: 'migration_not_run',
        migration: 'supabase/migrations/2026-08-13_perf_metrics.sql',
      }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate server-side (in-memory for now)
  const counts: Record<string, number> = {}
  const mutationLatency: Record<string, { count: number; sum: number; max: number }> = {}
  for (const row of data ?? []) {
    const key = `${row.metric_type}${row.entity ? '/' + row.entity : ''}${row.action ? '/' + row.action : ''}${row.route ? '/' + row.route : ''}`
    counts[key] = (counts[key] ?? 0) + 1
    if (row.metric_type === 'mutation' && row.duration_ms != null) {
      const e = (row.entity ?? 'unknown') + '/' + (row.action ?? 'unknown')
      const agg = mutationLatency[e] ?? { count: 0, sum: 0, max: 0 }
      agg.count++
      agg.sum += row.duration_ms
      agg.max = Math.max(agg.max, row.duration_ms)
      mutationLatency[e] = agg
    }
  }

  return NextResponse.json({
    windowHours: hours,
    since: sinceIso,
    counts,
    mutationLatency: Object.fromEntries(
      Object.entries(mutationLatency).map(([k, v]) => [k, {
        count: v.count,
        avg_ms: Math.round(v.sum / v.count),
        max_ms: v.max,
      }])
    ),
    sampleSize: data?.length ?? 0,
  }, { headers: { 'Cache-Control': 'no-store' } })
}