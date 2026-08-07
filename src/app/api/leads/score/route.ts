// app/api/leads/score/route.ts
// Plan C Wave 1 — Lead scoring endpoint.
// Recalculates `leads.score` (0-100) for one lead or all leads.
// Formula (deterministic, Indonesian real-estate sales heuristics):
//   stage:  new=10, contacted=25, surveyed=50, booked=70, closing=85, closed=100, batal=0
//   + contacted_at present:  +5
//   + surveyed_at present:   +5
//   + booked_at present:     +5
//   + estimated_value > 0:   +(value-weighted bonus, capped at +10)
//   clamp 0-100
//
// POST body (all optional):
//   { lead_id?: string }    // if omitted, recalc all 40 leads
// Owner + kepala_kantor only.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

const STAGE_BASE: Record<string, number> = {
  new: 10,
  contacted: 25,
  surveyed: 50,
  booked: 70,
  closing: 85,
  closed: 100,
  batal: 0,
}

function calculateScore(lead: {
  stage: string | null
  contacted_at: string | null
  surveyed_at: string | null
  booked_at: string | null
  estimated_value_rupiah: number | null
}): number {
  const base = STAGE_BASE[lead.stage ?? ''] ?? 5
  let bonus = 0
  if (lead.contacted_at) bonus += 5
  if (lead.surveyed_at) bonus += 5
  if (lead.booked_at) bonus += 5
  // Value-weighted: scale up to 10 points based on 500jt ceiling
  if (lead.estimated_value_rupiah && lead.estimated_value_rupiah > 0) {
    const valueBonus = Math.min(10, Math.round(lead.estimated_value_rupiah / 50_000_000))
    bonus += valueBonus
  }
  return Math.max(0, Math.min(100, base + bonus))
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    if (!['owner', 'kepala_kantor'].includes(payload.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const leadId = typeof body.lead_id === 'string' ? body.lead_id : null

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = sb
      .from('leads')
      .select('id, stage, contacted_at, surveyed_at, booked_at, estimated_value_rupiah')
    if (leadId) query = query.eq('id', leadId)
    const { data: leads, error: fetchErr } = await query
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!leads || leads.length === 0) {
      return NextResponse.json({ updated: 0, message: 'no leads matched' })
    }

    let updated = 0
    for (const lead of leads) {
      const score = calculateScore(lead)
      const { error: upErr } = await sb
        .from('leads')
        .update({ score })
        .eq('id', lead.id)
      if (!upErr) updated++
    }

    return NextResponse.json({
      updated,
      total: leads.length,
      message: leadId
        ? `recalculated 1 lead (${updated} updated)`
        : `recalculated ${leads.length} leads (${updated} updated)`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

// GET for inspection: returns the scoring formula + a sample calculation
// against the first 5 leads (so the UI can show "before/after" preview).
export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    if (!['owner', 'kepala_kantor'].includes(payload.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: leads, error } = await sb
      .from('leads')
      .select('id, code, customer_name, stage, contacted_at, surveyed_at, booked_at, estimated_value_rupiah, score')
      .order('score', { ascending: false, nullsFirst: false })
      .limit(5)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Provide computed + stored side-by-side for the first 5
    const sample = (leads ?? []).map((l) => ({
      id: l.id,
      code: l.code,
      customer_name: l.customer_name,
      stage: l.stage,
      current_score: l.score,
      calculated_score: calculateScore(l),
    }))

    return NextResponse.json({
      formula: {
        stage_base: STAGE_BASE,
        bonuses: {
          contacted_at: 5,
          surveyed_at: 5,
          booked_at: 5,
          value_per_50jt: 1,
          value_cap: 10,
        },
        clamp: '0-100',
      },
      sample,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
