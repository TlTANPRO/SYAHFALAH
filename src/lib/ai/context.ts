// lib/ai/context.ts
// Comprehensive Syahfalah business data context for the AI Copilot.
// Pulled in 1 fast pass (parallel Supabase queries); embedded as compact
// JSON in the LLM system prompt. Single source of truth — keeps the
// route handler thin.

import { createClient } from '@supabase/supabase-js'

export interface BusinessContext {
  generated_at: string
  company: {
    name: string
    as_of_ymd: string
    metrics: {
      leads_total: number
      leads_by_stage: Record<string, number>
      leads_total_value_rupiah: number
      kpis_total: number
      kpis_off_track: number
      kpis_on_track: number
      overdue_tasks: number
      overdue_consumer_cases: number
      open_maintenance_tickets: number
      overdue_purchase_requests: number
      pending_approvals: number
    }
    cashflow: {
      booking_pipeline_rupiah: number
      sp3k_submitted: number
      sp3k_approved: number
      akad_done: number
      maintenance_revenue_potential_rupiah: number
    }
    clusters: Array<{
      code: string
      name: string
      location: string
      total_units: number
      units_sold: number
      avg_price_rupiah: number
      is_active: boolean
    }>
    projects: Array<{
      code: string
      name: string
      status: string
      progress_pct: number
      budget_rupiah: number
      spent_rupiah: number
    }>
    people: {
      total_active_users: number
      by_role: Record<string, number>
      by_division: Array<{ division: string; count: number }>
      today_attendance: { checked_in: number; checked_out: number; not_yet_in: number; absent: number }
    }
    top_kpis: Array<{ name: string; progress_pct: number; status: string }>
    recent_activity: Array<{ ts: string; kind: string; title: string }>
    notifications_unread: number
  }
}

async function makeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('supabase env missing')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const TODAY = () => new Date().toISOString().slice(0, 10)

export async function loadBusinessContext(): Promise<BusinessContext> {
  const sb = await makeClient()
  const t0 = Date.now()

  // ============ Batch 1: counts (parallel, head + count only) ============
  const [
    leadsAll,
    kpiAll,
    kpiAtRisk,
    kpiOnTrack,
    overdueTasks,
    overdueCC,
    openMaint,
    overduePR,
    pendingAppr,
    activeUsers,
    notificationsUnread,
    todayAttendance,
  ] = await Promise.all([
    sb.from('leads').select('stage, estimated_value_rupiah'),
    sb.from('kpis').select('id', { count: 'exact', head: true }),
    sb.from('kpis').select('id', { count: 'exact', head: true }).eq('status', 'off_track'),
    sb.from('kpis').select('id', { count: 'exact', head: true }).eq('status', 'on_track'),
    sb.from('tasks').select('id', { count: 'exact', head: true }).eq('is_overdue', true),
    sb.from('consumer_cases').select('id', { count: 'exact', head: true }).eq('is_overdue', true),
    sb.from('maintenance_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    sb.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('users').select('id, role, division_id', { count: 'exact' }).eq('is_active', true),
    sb.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
    sb.from('attendance_logs').select('user_id, status, check_in_at, check_out_at').eq('log_date', TODAY()),
  ])

  // ============ Batch 2: read-through slices (small) ============
  const [clusters, projects, divisions, topKpis, recentLogs, sp3k, akad, bookings] = await Promise.all([
    sb.from('clusters').select('id, code, name, location, total_units, units_sold, average_price_rupiah, is_active').order('name').limit(50),
    sb.from('projects').select('id, code, name, status, budget_rupiah, spent_rupiah, start_date, target_completion_date, total_units, units_completed').order('name').limit(50),
    sb.from('divisions').select('id, name, code').order('name'),
    sb.from('kpis').select('name, progress, status').neq('status', 'not_started').order('progress', { ascending: false }).limit(10),
    sb.from('audit_logs').select('id, user_id, action, table_name, created_at').order('created_at', { ascending: false }).limit(8),
    sb.from('sp3k').select('id, status'),
    sb.from('akad').select('id, status'),
    sb.from('bookings').select('id, status, booking_fee'),
  ])

  // Lead aggregate
  const leadsTotal = leadsAll.data?.length ?? 0
  const leadsByStage: Record<string, number> = {}
  let leadsTotalValueRupiah = 0
  for (const r of leadsAll.data ?? []) {
    const st = (r as any).stage ?? 'unknown'
    leadsByStage[st] = (leadsByStage[st] ?? 0) + 1
    const v = Number((r as any).estimated_value_rupiah ?? 0)
    leadsTotalValueRupiah += Number.isFinite(v) ? v : 0
  }

  // People aggregates
  const byRole: Record<string, number> = {}
  const divCounts: Record<string, number> = {}
  for (const u of activeUsers.data ?? []) {
    byRole[(u as any).role] = ((byRole[(u as any).role] ?? 0) + 1)
    if ((u as any).division_id) {
      divCounts[String((u as any).division_id)] = (divCounts[String((u as any).division_id)] ?? 0) + 1
    }
  }
  const divMap = new Map<string, string>()
  for (const d of divisions.data ?? []) divMap.set((d as any).id, (d as any).name)
  const byDivision = Object.entries(divCounts).map(([id, count]) => ({ division: divMap.get(id) ?? id, count }))

  // Attendance: count by check-in/check-out state for today
  const att = { checked_in: 0, checked_out: 0, not_yet_in: 0, absent: 0 }
  for (const log of todayAttendance.data ?? []) {
    const hasIn = !!(log as any).check_in_at
    const hasOut = !!(log as any).check_out_at
    if (hasIn && hasOut) att.checked_out++
    else if (hasIn) att.checked_in++
    else att.not_yet_in++
  }
  // Absent = active users − everyone who has a log today
  const totalActive = activeUsers.count ?? 0
  const hasAnyLog = new Set((todayAttendance.data ?? []).map((l: any) => l.user_id)).size
  att.absent = Math.max(0, totalActive - hasAnyLog)

  // Cashflow aggregates
  const bookingPipeline = (bookings.data ?? []).reduce((a, r: any) => a + Number(r.booking_fee ?? 0), 0)
  let sp3kSubmitted = 0, sp3kApproved = 0, akadDone = 0
  for (const r of sp3k.data ?? []) {
    if ((r as any).status === 'submitted') sp3kSubmitted++
    else if ((r as any).status === 'approved') sp3kApproved++
  }
  for (const r of akad.data ?? []) {
    if ((r as any).status === 'done') akadDone++
  }
  const maintCost = (await Promise.all([
    sb.from('maintenance_tickets').select('cost_rupiah').in('status', ['open', 'in_progress']),
  ]))[0]
  const maintRevenue = (maintCost.data ?? []).reduce((a: number, r: any) => a + Number(r.cost_rupiah ?? 0), 0)

  // Cluster & project shape
  const clusterSlice = (clusters.data ?? []).map((c: any) => ({
    code: c.code,
    name: c.name,
    location: c.location ?? '',
    total_units: c.total_units ?? 0,
    units_sold: c.units_sold ?? 0,
    avg_price_rupiah: Number(c.average_price_rupiah ?? 0),
    is_active: !!c.is_active,
  }))
  const projectSlice = (projects.data ?? []).map((p: any) => {
    const total = Number(p.total_units ?? 0)
    const done = Number(p.units_completed ?? 0)
    const prog = total > 0 ? Math.round((done / total) * 100) : 0
    return {
      code: p.code, name: p.name,
      status: p.status ?? 'unknown',
      progress_pct: prog,
      budget_rupiah: Number(p.budget_rupiah ?? 0),
      spent_rupiah: Number(p.spent_rupiah ?? 0),
    }
  })

  // Recent activity
  const recent = (recentLogs.data ?? []).map((r: any) => ({
    ts: (r.created_at ?? '').slice(0, 16).replace('T', ' '),
    kind: r.action ?? 'event',
    title: r.table_name ? `${r.action ?? 'edit'} ${r.table_name}` : (r.action ?? ''),
  }))

  const ctx: BusinessContext = {
    generated_at: new Date().toISOString(),
    company: {
      name: 'PT Syahfalah',
      as_of_ymd: TODAY(),
      metrics: {
        leads_total: leadsTotal,
        leads_by_stage: leadsByStage,
        leads_total_value_rupiah: leadsTotalValueRupiah,
        kpis_total: kpiAll.count ?? 0,
        kpis_off_track: kpiAtRisk.count ?? 0,
        kpis_on_track: kpiOnTrack.count ?? 0,
        overdue_tasks: overdueTasks.count ?? 0,
        overdue_consumer_cases: overdueCC.count ?? 0,
        open_maintenance_tickets: openMaint.count ?? 0,
        overdue_purchase_requests: overduePR.count ?? 0,
        pending_approvals: pendingAppr.count ?? 0,
      },
      cashflow: {
        booking_pipeline_rupiah: bookingPipeline,
        sp3k_submitted: sp3kSubmitted,
        sp3k_approved: sp3kApproved,
        akad_done: akadDone,
        maintenance_revenue_potential_rupiah: maintRevenue,
      },
      clusters: clusterSlice,
      projects: projectSlice,
      people: {
        total_active_users: totalActive,
        by_role: byRole,
        by_division: byDivision,
        today_attendance: att,
      },
      top_kpis: (topKpis.data ?? []).map((k: any) => ({
        name: k.name ?? '',
        progress_pct: Number(k.progress ?? 0),
        status: k.status ?? '',
      })),
      recent_activity: recent,
      notifications_unread: notificationsUnread.count ?? 0,
    },
  }
  void t0
  return ctx
}

// Helper to summarize a single context slice given a question (deterministic).
export function deterministicSlice(question: string, ctx: BusinessContext): string {
  const m = ctx.company.metrics
  const c = ctx.company.cashflow
  const p = ctx.company.people
  const lines: string[] = []
  const qLower = question.toLowerCase()

  if (qLower.match(/status|kpi|kondisi|health|ringkas/i)) {
    lines.push(`- Leads pipeline: ${m.leads_total} (est. value Rp ${fmt(m.leads_total_value_rupiah)})`)
    Object.entries(m.leads_by_stage).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .forEach(([st, n]) => lines.push(`  · ${st}=${n}`))
    lines.push(`- KPI: ${m.kpis_on_track} on_track / ${m.kpis_off_track} off_track (of ${m.kpis_total} total)`)
    lines.push(`- Overdue tasks: ${m.overdue_tasks}; overdue consumer cases: ${m.overdue_consumer_cases}`)
    lines.push(`- Maintenance open: ${m.open_maintenance_tickets}; pending approvals: ${m.pending_approvals}`)
    lines.push(`- Booking pipeline: Rp ${fmt(c.booking_pipeline_rupiah)}`)
    lines.push(`- SP3K submitted=${c.sp3k_submitted}, approved=${c.sp3k_approved}, Akad done=${c.akad_done}`)
    lines.push(`- People: ${p.total_active_users} aktif, hari ini ${p.today_attendance.checked_in} check-in, ${p.today_attendance.checked_out} check-out, ${p.today_attendance.absent} alpha (tanpa log)`)
    if (ctx.company.notifications_unread > 0) lines.push(`- Notifikasi belum dibaca: ${ctx.company.notifications_unread}`)
  } else if (qLower.match(/blok|hambat|overdue|telat|macet|risk|warning/i)) {
    if (m.overdue_tasks > 0) lines.push(`- ⚠ ${m.overdue_tasks} tasks overdue`)
    if (m.overdue_consumer_cases > 0) lines.push(`- ⚠ ${m.overdue_consumer_cases} consumer cases overdue`)
    if (m.kpis_off_track > 0) lines.push(`- ⚠ ${m.kpis_off_track} KPI off-track`)
    if (m.open_maintenance_tickets > 0) lines.push(`- ${m.open_maintenance_tickets} maintenance tickets open`)
    if (m.pending_approvals > 0) lines.push(`- ${m.pending_approvals} pending approvals`)
    if (m.overdue_purchase_requests > 0) lines.push(`- ⚠ ${m.overdue_purchase_requests} purchase request pending`)
    if (c.sp3k_submitted > 0) lines.push(`- ${c.sp3k_submitted} SP3K submitted (belum approved)`)
    if (c.akad_done === 0 && c.sp3k_approved > 0) lines.push(`- ${c.sp3k_approved} SP3K approved, Akad belum done`)
    if (lines.length === 0) lines.push('- Tidak ada blocker signifikan terdeteksi.')
  } else if (qLower.match(/cluster|projects|real estate|unit|cashflow|uang|sale/i)) {
    lines.push(`- Cluster aktif (top):`)
    ctx.company.clusters.slice(0, 5).forEach(cl => {
      lines.push(`  · ${cl.code} ${cl.name} @ ${cl.location}: ${cl.units_sold}/${cl.total_units} unit, avg Rp ${fmt(cl.avg_price_rupiah)}`)
    })
    lines.push(`- Projects:`)
    ctx.company.projects.slice(0, 5).forEach(p2 => {
      lines.push(`  · ${p2.code} ${p2.name} (${p2.status}, ${p2.progress_pct}% done, spent Rp ${fmt(p2.spent_rupiah)} of ${fmt(p2.budget_rupiah)})`)
    })
    lines.push(`- Booking pipeline total: Rp ${fmt(c.booking_pipeline_rupiah)}`)
  } else if (qLower.match(/orang|user|karyawan|pegawai|sdm|absen|attendance|hadir|masuk|staff/i)) {
    lines.push(`- Active users: ${p.total_active_users} (by role: ${Object.entries(p.by_role).map(([k, v]) => `${k}=${v}`).join(', ')})`)
    lines.push(`- Today attendance: check-in=${p.today_attendance.checked_in}, check-out=${p.today_attendance.checked_out}, alpha=${p.today_attendance.absent}`)
    p.by_division.slice(0, 5).forEach(d => lines.push(`  · ${d.division}: ${d.count} org`))
  } else {
    lines.push(`- Leads: ${m.leads_total} (Rp ${fmt(m.leads_total_value_rupiah)})`)
    lines.push(`- KPIs: ${m.kpis_on_track}/${m.kpis_total} on-track, ${m.kpis_off_track} off-track`)
    lines.push(`- Overdue: ${m.overdue_tasks} tasks, ${m.overdue_consumer_cases} consumer cases`)
    lines.push(`- Pipeline cashflow: Rp ${fmt(c.booking_pipeline_rupiah)}`)
    lines.push(`- People: ${p.total_active_users} aktif`)
  }
  return lines.join('\n')
}

function fmt(n: number): string {
  if (!n || !Number.isFinite(n)) return '0'
  return new Intl.NumberFormat('id-ID').format(Math.round(n))
}
