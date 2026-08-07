// app/api/targets/route.ts
// Plan C Phase 1 item 2 — Target cascade write endpoint.
// POST creates a new kpi_targets row with cascade_period + parent_target_id
// and auto-calculates child target_value based on parent (cascading down).
// PATCH updates target_value on an existing row; if auto_calculate=true on
// that row's children, also recompute children.
//
// Body for POST:
//   {
//     kpi_definition_id: string,
//     period: 'YYYY-MM' | 'YYYY',
//     target_value: number,
//     cascade_period: 'yearly' | 'quarterly' | 'monthly' | 'weekly' | 'daily',
//     parent_target_id?: string,    // links to parent target
//     auto_calculate?: boolean,
//   }
//
// Cascade math (Plan C: 120/year → 10/month → 3/week → 1/day):
//   yearly   → quarterly: /4
//   quarterly→ monthly:   /3
//   monthly  → weekly:    /4.33
//   weekly   → daily:     /7
//   (rounded to 2 decimal places)
//
// Auth: owner only.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

const PERIOD_DIVISOR: Record<string, number> = {
  yearly: 4,        // → quarterly
  quarterly: 3,     // → monthly
  monthly: 4.33,    // → weekly (avg weeks/month)
  weekly: 7,        // → daily
}

const VALID_PERIODS = ['yearly', 'quarterly', 'monthly', 'weekly', 'daily'] as const
type CascadePeriod = (typeof VALID_PERIODS)[number]

async function requireOwner() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return { error: 'unauthenticated', status: 401 } as const
  const payload = await verifyAccessToken(token)
  if (!payload) return { error: 'invalid session', status: 401 } as const
  if (payload.role !== 'owner') return { error: 'forbidden', status: 403 } as const
  return { payload } as const
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  const { kpi_definition_id, period, target_value, cascade_period, parent_target_id, auto_calculate } = body
  if (!kpi_definition_id || !period || target_value == null) {
    return NextResponse.json(
      { error: 'kpi_definition_id, period, target_value wajib diisi' },
      { status: 400 }
    )
  }
  if (cascade_period && !VALID_PERIODS.includes(cascade_period)) {
    return NextResponse.json(
      { error: `cascade_period tidak valid. Pilihan: ${VALID_PERIODS.join(',')}` },
      { status: 400 }
    )
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await sb
    .from('kpi_targets')
    .insert({
      kpi_definition_id,
      period,
      target_value,
      cascade_period: cascade_period ?? null,
      parent_target_id: parent_target_id ?? null,
      auto_calculate: auto_calculate ?? false,
    })
    .select('id, kpi_definition_id, period, target_value, cascade_period, parent_target_id, auto_calculate')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If auto_calculate + cascade_period set: compute the suggested child
  // value but DO NOT auto-create children (caller decides which periods to
  // spawn). Return the suggestion so the UI can preview it.
  let childSuggestion: { period: string; suggested_value: number } | null = null
  if (cascade_period && PERIOD_DIVISOR[cascade_period]) {
    childSuggestion = {
      period: nextPeriod(period, cascade_period as CascadePeriod),
      suggested_value: round2(target_value / PERIOD_DIVISOR[cascade_period]),
    }
  }

  return NextResponse.json(
    { data, child_suggestion: childSuggestion },
    { status: 201 }
  )
}

export async function PATCH(req: NextRequest) {
  const auth = await requireOwner()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const { id, target_value } = body
  if (!id || target_value == null) {
    return NextResponse.json({ error: 'id dan target_value wajib diisi' }, { status: 400 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Update target
  const { data, error } = await sb
    .from('kpi_targets')
    .update({ target_value })
    .eq('id', id)
    .select('id, kpi_definition_id, period, target_value, cascade_period, parent_target_id, auto_calculate')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Find children with auto_calculate=true
  const { data: children } = await sb
    .from('kpi_targets')
    .select('id, period, cascade_period, auto_calculate')
    .eq('parent_target_id', id)

  const updated: string[] = []
  if (children && data.cascade_period) {
    const divisor = PERIOD_DIVISOR[data.cascade_period]
    if (divisor) {
      for (const c of children) {
        if (!c.auto_calculate) continue
        const newVal = round2(target_value / divisor)
        const { error: upErr } = await sb
          .from('kpi_targets')
          .update({ target_value: newVal })
          .eq('id', c.id)
        if (!upErr) updated.push(c.id)
      }
    }
  }

  return NextResponse.json({ data, children_updated: updated })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// "YYYY" -> "YYYY-Q1" or "YYYY-MM" depending on parent period shape.
// Best-effort: split YYYY-MM into next month, YYYY into next quarter.
function nextPeriod(period: string, fromCascade: CascadePeriod): string {
  if (fromCascade === 'yearly') {
    // yearly YYYY → quarterly YYYY-Q1
    return `${period}-Q1`
  }
  if (fromCascade === 'quarterly') {
    // quarterly YYYY-Q1 → monthly YYYY-01
    return `${period.slice(0, 4)}-01`
  }
  if (fromCascade === 'monthly') {
    // monthly YYYY-MM → weekly YYYY-MM-W1
    return `${period}-W1`
  }
  // weekly → daily: caller decides the date
  return period
}
