// src/app/api/cron/snapshot/route.ts
// Phase 4-5 — DW snapshot worker.
// Idempotent: one snapshot per date (enforced via UNIQUE on dw_snapshots.snapshot_date).
// Invoked by Vercel Cron daily at 02:00 WIB (19:00 UTC). Trigger the row
// for snapshot_date=YYYY-MM-DD. Reads current state of KPIs / leads /
// tasks / consumer cases / purchase orders + inserts summary facts.
//
// Verifies Bearer token via CRON_SECRET to prevent public abuse.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'env missing' }, { status: 500 })

  // Cron auth: Vercel sends Authorization: Bearer $CRON_SECRET
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Snapshot date — explicit ?date=YYYY-MM-DD, else today (UTC).
  const today = new Date().toISOString().slice(0, 10)
  const snapshotDate = req.nextUrl.searchParams.get('date') ?? today

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // Create snapshot row (idempotent on conflict: skip if already completed today)
  const { data: snap, error: snapErr } = await sb
    .from('dw_snapshots')
    .upsert({ snapshot_date: snapshotDate, status: 'running', started_at: new Date().toISOString() },
      { onConflict: 'snapshot_date', ignoreDuplicates: false })
    .select('id, status')
    .single()
  if (snapErr || !snap) {
    return NextResponse.json({ error: `snapshot upsert: ${snapErr?.message}` }, { status: 500 })
  }

  // If already completed, skip (re-running same-day is no-op)
  if (snap.status === 'completed') {
    return NextResponse.json({ snapshot_id: snap.id, status: 'already-completed', date: snapshotDate })
  }

  const counts: Record<string, number> = {}

  // ============ dw_fact_kpis ============
  const { data: kpi } = await sb.from('kpi_targets')
    .select('user_id, division_id, kpi_def_id, target_value, actual_value, progress_percentage, status')
  if (kpi && kpi.length > 0) {
    const rows = kpi.map((r: any) => ({
      snapshot_id: snap.id, snapshot_date: snapshotDate,
      user_id: r.user_id ?? null, division_id: r.division_id ?? null,
      kpi_def_id: r.kpi_def_id ?? null,
      target_value: r.target_value, actual_value: r.actual_value,
      progress: r.progress_percentage, status: r.status,
    }))
    const { count: c } = await sb.from('dw_fact_kpis').insert(rows, { count: 'exact' })
    counts.dw_fact_kpis = c ?? rows.length
  } else counts.dw_fact_kpis = 0

  // ============ dw_fact_leads ============
  const { data: leads } = await sb.from('leads')
    .select('id, stage, source, cluster_id, estimated_value_rupiah, score')
  if (leads && leads.length > 0) {
    const rows = leads.map((r: any) => ({
      snapshot_id: snap.id, snapshot_date: snapshotDate,
      lead_id: r.id, stage: r.stage, source: r.source, cluster_id: r.cluster_id,
      estimated_value_rupiah: r.estimated_value_rupiah, score: r.score,
    }))
    const { count: c } = await sb.from('dw_fact_leads').insert(rows, { count: 'exact' })
    counts.dw_fact_leads = c ?? rows.length
  } else counts.dw_fact_leads = 0

  // ============ dw_fact_tasks ============
  const { data: tasks } = await sb.from('tasks')
    .select('user_id, id, status, is_overdue, completed_at, due_date')
    .limit(10_000)
  if (tasks && tasks.length > 0) {
    const rows = tasks.map((r: any) => ({
      snapshot_id: snap.id, snapshot_date: snapshotDate,
      user_id: r.user_id, task_id: r.id, status: r.status,
      is_overdue: r.is_overdue, completed_at: r.completed_at, due_date: r.due_date,
    }))
    const { count: c } = await sb.from('dw_fact_tasks').insert(rows, { count: 'exact' })
    counts.dw_fact_tasks = c ?? rows.length
  } else counts.dw_fact_tasks = 0

  // ============ dw_fact_cashflow ============
  const [cc, po, bk] = await Promise.all([
    sb.from('consumer_cases').select('id, cluster_id, stage, amount_rupiah').limit(5_000),
    sb.from('purchase_orders').select('id, project_id, status, total_rupiah').limit(5_000),
    sb.from('bookings').select('id, cluster_id, status').limit(5_000),
  ])
  const rows: any[] = []
  for (const r of (cc.data ?? []) as any[]) rows.push({ snapshot_id: snap.id, snapshot_date: snapshotDate, kind: 'consumer_case', ref_id: r.id, cluster_id: r.cluster_id, status: r.stage, amount_rupiah: r.amount_rupiah })
  for (const r of (po.data ?? []) as any[]) rows.push({ snapshot_id: snap.id, snapshot_date: snapshotDate, kind: 'purchase_order', ref_id: r.id, cluster_id: r.project_id, status: r.status, amount_rupiah: r.total_rupiah })
  for (const r of (bk.data ?? []) as any[]) rows.push({ snapshot_id: snap.id, snapshot_date: snapshotDate, kind: 'booking', ref_id: r.id, cluster_id: r.cluster_id, status: r.status, amount_rupiah: 0 })
  counts.dw_fact_cashflow = rows.length
  if (rows.length > 0) {
    await sb.from('dw_fact_cashflow').insert(rows)
  }

  // Mark snapshot completed
  await sb.from('dw_snapshots').update({
    status: 'completed',
    row_counts: counts,
    completed_at: new Date().toISOString(),
  }).eq('id', snap.id)

  return NextResponse.json({
    snapshot_id: snap.id,
    date: snapshotDate,
    status: 'completed',
    row_counts: counts,
  })
}
