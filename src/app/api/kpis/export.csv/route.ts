// app/api/kpis/export.csv/route.ts
// Plan C Phase 1 item 7 — CSV export for KPI actuals.
// Owner or Kepala Kantor. Returns text/csv with UTF-8 BOM (Excel-friendly).
// Same filter params as /api/kpis (q, division, period). Streams the full
// result set — no pagination, intended for download/export workflows.

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

const SELECT = 'id, code, name, level, unit, division_id, baseline_target_value, actual_value, progress, status, period'

function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines: string[] = []
  lines.push(headers.map(csvEscape).join(','))
  for (const r of rows) {
    lines.push(headers.map(h => csvEscape(r[h])).join(','))
  }
  return '\ufeff' + lines.join('\n') + '\n'
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return new Response('unauthenticated', { status: 401 })

    const payload = await verifyAccessToken(accessToken)
    if (!payload) return new Response('invalid session', { status: 401 })
    if (payload.role !== 'owner' && payload.role !== 'kepala_kantor') {
      return new Response('forbidden', { status: 403 })
    }

    const url = req.nextUrl
    const q = url.searchParams.get('q')?.trim()
    const division = url.searchParams.get('division') || 'all'
    const period = url.searchParams.get('period')?.trim() || ''

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Cap at 10,000 rows — well above any realistic KPI count for SMB
    // but bounded to prevent accidental OOM on huge queries.
    let query = serviceClient
      .from('kpis')
      .select(SELECT)
      .order('progress', { ascending: false })
      .limit(10_000)

    if (division !== 'all') query = query.eq('division_id', division)
    if (period) query = query.eq('period', period)
    if (q) query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%`)

    const { data, error } = await query
    if (error) return new Response(`db error: ${error.message}`, { status: 500 })

    // Resolve division names in a single follow-up query
    const divIds = Array.from(new Set((data ?? []).map(r => r.division_id).filter(Boolean))) as string[]
    let divName = new Map<string, string>()
    if (divIds.length > 0) {
      const { data: divs } = await serviceClient
        .from('divisions')
        .select('id, name')
        .in('id', divIds)
      divName = new Map((divs ?? []).map(d => [d.id, d.name]))
    }

    const rows = (data ?? []).map(r => ({
      code: r.code ?? '',
      name: r.name ?? '',
      level: r.level,
      unit: r.unit ?? '',
      division: r.division_id ? divName.get(r.division_id) ?? '' : '',
      period: r.period ?? '',
      baseline_target_value: r.baseline_target_value ?? '',
      actual_value: r.actual_value ?? '',
      progress: r.progress != null ? `${r.progress.toFixed(0)}%` : '',
      status: r.status ?? '',
    }))

    const csv = toCsv(
      ['code', 'name', 'level', 'unit', 'division', 'period', 'baseline_target_value', 'actual_value', 'progress', 'status'],
      rows
    )

    const today = new Date().toISOString().slice(0, 10)
    const filename = `kpi-${today}.csv`

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    return new Response(`internal: ${err?.message ?? 'unknown'}`, { status: 500 })
  }
}
