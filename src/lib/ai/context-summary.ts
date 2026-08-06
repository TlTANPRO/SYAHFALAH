// lib/ai/context-summary.ts
// Compact business context loader. Strips verbose narrative; returns
// minimum essential numbers + identifiers for fast LLM grounding.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface Slice {
  leads_total: number
  leads_value_rupiah: number
  leads_new_7d: number
  kpis_total: number
  kpis_off_track: number
  overdue_tasks: number
  open_maintenance: number
  pending_approvals: number
  cashflow_booking_rupiah: number
  akad_done: number
  total_active: number
  attended_today: number
  unread_notifications: number
}

const EMPTY_SLICE: Slice = {
  leads_total: 0, leads_value_rupiah: 0, leads_new_7d: 0,
  kpis_total: 0, kpis_off_track: 0, overdue_tasks: 0,
  open_maintenance: 0, pending_approvals: 0,
  cashflow_booking_rupiah: 0, akad_done: 0,
  total_active: 0, attended_today: 0, unread_notifications: 0,
}

let cache: { value: Slice; ts: number } | null = null
const TTL_MS = 30_000

export async function loadBusinessSummary(): Promise<Slice> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.value
  const db = createClient(SUPABASE_URL, SUPABASE_KEY)
  const out: Slice = { ...EMPTY_SLICE }
  try {
    const [leads, kpis, tasks, maint, approvals, cashflow, akad, users, notif] = await Promise.all([
      db.from('leads').select('id, value_rupiah, created_at', { count: 'exact', head: false }).limit(0),
      db.from('kpis').select('id, status', { count: 'exact', head: false }).limit(0),
      db.from('tasks').select('id, status', { count: 'exact', head: false }).limit(0),
      db.from('maintenance_tickets').select('id, status', { count: 'exact', head: false }).limit(0),
      db.from('approvals').select('id, status', { count: 'exact', head: false }).limit(0),
      db.from('bookings').select('total_rupiah, status', { count: 'exact', head: false }).limit(0),
      db.from('akad').select('id', { count: 'exact', head: true }),
      db.from('users').select('id, is_active', { count: 'exact', head: false }).limit(0),
      db.from('notifications').select('id, is_read', { count: 'exact', head: false }).limit(0),
    ])
    out.leads_total = leads.count ?? 0
    out.leads_value_rupiah = (leads.data ?? []).reduce((s: number, r: any) => s + (Number(r.value_rupiah) || 0), 0)
    const seven = Date.now() - 7 * 86400 * 1000
    out.leads_new_7d = (leads.data ?? []).filter((r: any) => new Date(r.created_at).getTime() > seven).length
    out.kpis_total = kpis.count ?? 0
    out.kpis_off_track = (kpis.data ?? []).filter((r: any) => r.status === 'off_track' || r.status === 'at_risk').length
    out.overdue_tasks = (tasks.data ?? []).filter((r: any) => r.status === 'overdue').length
    out.open_maintenance = (maint.data ?? []).filter((r: any) => r.status !== 'closed').length
    out.pending_approvals = (approvals.data ?? []).filter((r: any) => r.status === 'pending').length
    out.cashflow_booking_rupiah = (cashflow.data ?? []).reduce((s: number, r: any) => s + (Number(r.total_rupiah) || 0), 0)
    out.akad_done = akad.count ?? 0
    out.total_active = (users.data ?? []).filter((r: any) => r.is_active).length
    out.attended_today = (users.data ?? []).filter((r: any) => r.is_active).length  // approximation
    out.unread_notifications = (notif.data ?? []).filter((r: any) => !r.is_read).length
  } catch { /* leave zeros */ }
  cache = { value: out, ts: Date.now() }
  return out
}

export function formatSummary(s: Slice): string {
  return `Syahfalah snapshot: ${s.leads_total} leads (Rp ${(s.leads_value_rupiah/1e9).toFixed(1)}M, +${s.leads_new_7d} minggu ini) · ${s.kpis_off_track}/${s.kpis_total} KPI off-track · ${s.overdue_tasks} task overdue · ${s.open_maintenance} maintenance open · ${s.pending_approvals} approval pending · booking pipeline Rp ${(s.cashflow_booking_rupiah/1e9).toFixed(1)}M · ${s.akad_done} akad done · ${s.total_active} aktif · ${s.unread_notifications} notifikasi belum dibaca.`
}
