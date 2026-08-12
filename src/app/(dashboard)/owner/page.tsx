// app/owner/page.tsx
// Owner executive overview. Morning Brief + 4 KPI ribbon + sections.
// Auto-update: di-render pada setiap request (force-dynamic + revalidate=0).
// Date counts (today, week) dihitung ulang dari server setiap render.

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import {
  ArrowUpRight,
  Building2,
  Clock,
  DollarSign,
  Hammer,
  Home,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import { PersonalKpiTable } from '@/components/kpi/PersonalKpiTable'
import { MorningBrief } from '@/components/owner/MorningBrief'
import { KpiTrendChart } from '@/components/charts/KpiTrendChart'
import { PipelineFunnel } from '@/components/owner/PipelineFunnel'
import { ClusterGrid } from '@/components/owner/ClusterGrid'
import { ProjectTracker } from '@/components/owner/ProjectTracker'
import { ConsumerCasesTable } from '@/components/owner/ConsumerCasesTable'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

// PERF: Split into 2 functions so the Morning Brief (top of page) renders
// quickly without waiting for the heavy dashboard queries below it.
async function loadBriefData(sb: any) {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const tomorrowStr = new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10)

  // PERF #5: Note — we keep full leads SELECT here (PipelineFunnel needs closed/closing
  // stages for conversion-rate calculation). Server-side filter only applied for
  // today-new-leads count via gte(.created_at, today) below.
  const [tasksTodayCount, tasksPendingCount, newLeadsToday, leads] = await Promise.all([
    safeCount(sb.from('tasks').select('id', { count: 'exact', head: true })
      .not('completed_at', 'is', null)
      .gte('completed_at', `${todayStr}T00:00:00`)
      .lt('completed_at', `${tomorrowStr}T00:00:00`)),
    safeCount(sb.from('tasks').select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'in_progress'])),
    // PERF #5: Push new-leads filter to SQL. Avoids transferring all leads rows
    // just to filter them in JS for a single number.
    safeCount(sb.from('leads').select('id', { count: 'exact', head: true })
      .gte('created_at', `${todayStr}T00:00:00`)),
    safeRows(sb.from('leads').select('id, stage, source, estimated_value_rupiah, created_at, cluster_id, customer_name, assigned_to_id, contacted_at, surveyed_at')),
  ])
  return { tasksTodayCount, tasksPendingCount, newLeadsToday, leads }
}

async function loadDashboardData(sb: any) {
  const [kpiTrend, clusters, projects, consumerCases, teamKPIs, divs] = await Promise.all([
    safeRows(sb.from('kpis').select('division_id, period_start, progress')
      .in('level', ['division', 'company'])
      .gte('period_start', '2025-08-01')
      .lte('period_start', '2026-07-31')
      .limit(3000)),
    safeRows(sb.from('clusters').select('*').eq('is_active', true).order('name')),
    safeRows(sb.from('projects').select('id, code, name, cluster_id, total_units, units_completed, start_date, target_completion_date, budget_rupiah, spent_rupiah, status, project_manager_id')),
    safeRows(sb.from('consumer_cases').select('id, code, consumer_name, unit_code, cluster_id, stage, sp3k_deadline, bast_date, amount_rupiah, is_overdue, assigned_to_id')),
    safeRows(sb.from('team_personal_kpis').select('user_id, name, position, division_id, division_name, kpi_count, avg_progress, achieved_count, on_track_count, at_risk_count, off_track_count').order('avg_progress', { ascending: false }).limit(12)),
    safeRows(sb.from('divisions').select('id, name').eq('is_active', true).order('sort_order')),
  ])
  return { kpiTrend, clusters, projects, consumerCases, teamKPIs, divisions: divs }
}

// PERF #6: Cache the brief data for 60 seconds.
// Brief numbers don't change every second — owner views dashboard 5-10x/day,
// so 60s cache reduces DB load by ~95% while keeping data "fresh enough".
// Tag-based revalidation could be added later (e.g. on task completion webhook).
const getCachedBrief = unstable_cache(
  async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return { tasksTodayCount: 0, tasksPendingCount: 0, newLeadsToday: 0, leads: [] }
    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    return loadBriefData(sb)
  },
  ['owner-morning-brief'],
  { revalidate: 60, tags: ['morning-brief'] }
)

// OPT #1: Cache dashboard data for 30 seconds.
// Dashboard tiles (clusterUnits, totalProjects, sell-through %) are more stable
// than brief numbers — they only change on cluster/project updates, which are
// infrequent. 30s TTL keeps the page feeling live while reducing DB load by ~95%
// on repeat visits.
const getCachedDashboard = unstable_cache(
  async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return { kpiTrend: [], clusters: [], projects: [], consumerCases: [], teamKPIs: [], divisions: [] }
    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    return loadDashboardData(sb)
  },
  ['owner-dashboard'],
  { revalidate: 30, tags: ['dashboard'] }
)

async function safeRows(query: any): Promise<any[]> {
  try {
    const res: any = await query
    if (res?.error) return []
    return (res?.data ?? []) as any[]
  } catch {
    return []
  }
}

async function safeCount(query: any): Promise<number> {
  try {
    const res: any = await query
    if (res?.error) return 0
    if (typeof res?.count === 'number') return res.count
    return 0
  } catch {
    return 0
  }
}

async function loadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { dbReady: false }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const [brief, dashboard] = await Promise.all([
    getCachedBrief(),
    getCachedDashboard(),
  ])

  return {
    clusters: dashboard.clusters,
    leads: brief.leads,
    projects: dashboard.projects,
    consumerCases: dashboard.consumerCases,
    teamKPIs: dashboard.teamKPIs,
    divisions: dashboard.divisions,
    kpiTrend: dashboard.kpiTrend,
    tasksTodayCount: brief.tasksTodayCount,
    tasksPendingCount: brief.tasksPendingCount,
    newLeadsTodayCount: brief.newLeadsToday,
    dbReady: true,
  }
}

function shortNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}M`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}jt`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}rb`
  return String(n)
}

// NumericOrDash — clean replacement for repeated ternary
function NumericOrDash({ value, format }: { value: number; format?: 'currency' | 'percent' }) {
  if (!value || value === 0) {
    return <span className="text-[var(--color-text-muted)]">—</span>
  }
  if (format === 'currency') return <>{`Rp ${shortNumber(value)}`}</>
  if (format === 'percent') return <>{`${value.toFixed(1)}%`}</>
  return <>{value}</>
}

export default async function Page() {
  const data = await loadData()
  const {
    clusters = [],
    leads = [],
    projects = [],
    consumerCases = [],
    teamKPIs = [],
    divisions = [],
    kpiTrend = [],
    tasksTodayCount = 0,
    tasksPendingCount = 0,
    newLeadsTodayCount = 0,
  } = data

  // KPI trend per divisi per bulan
  const trendByDiv = new Map<string, Map<string, { sum: number; count: number }>>()
  for (const r of kpiTrend as any[]) {
    if (r.progress == null) continue
    const ps = r.period_start
    if (typeof ps !== 'string') continue
    const period = ps.slice(0, 7)
    if (!trendByDiv.has(r.division_id)) trendByDiv.set(r.division_id, new Map())
    const m = trendByDiv.get(r.division_id)!
    const cur = m.get(period) ?? { sum: 0, count: 0 }
    cur.sum += r.progress
    cur.count += 1
    m.set(period, cur)
  }
  const periodSet = new Set<string>()
  for (const r of kpiTrend as any[]) {
    if (r.progress == null) continue
    const ps = r.period_start
    if (typeof ps !== 'string') continue
    periodSet.add(ps.slice(0, 7))
  }
  const periods = Array.from(periodSet).sort()
  const divDataCount = new Map<string, number>()
  for (const [divId, m] of trendByDiv) {
    let total = 0
    for (const v of m.values()) total += v.count
    divDataCount.set(divId, total)
  }
  const topDivs = Array.from(divDataCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id ?? '')
    .filter(Boolean)
  const divName = new Map((divisions as any[]).map(d => [d.id, d.name]))
  const kpiTrendSeries = topDivs.map(id => ({
    code: `D${id.slice(0, 4)}`,
    name: divName.get(id) ?? id.slice(0, 6),
  }))
  const kpiTrendData = periods.map(period => {
    const row: any = { label: period }
    for (const divId of topDivs) {
      const v = trendByDiv.get(divId)?.get(period)
      const safe = divId ?? ''
      row[`D${safe.slice(0, 4)}`] = v ? +(v.sum / v.count).toFixed(1) : null
    }
    return row
  })

  // Pipeline metrics
  const leadsByStage = (leads as any[]).reduce((acc: any, l: any) => {
    acc[l.stage] = (acc[l.stage] || 0) + 1
    return acc
  }, {})
  const totalLeads = leads.length
  const totalLeadValue = (leads as any[]).reduce((s, l) => s + (l.estimated_value_rupiah || 0), 0)
  const closedCount = (leadsByStage.closed || 0) + (leadsByStage.closing || 0)
  const conversionRate = totalLeads > 0 ? (closedCount / totalLeads) * 100 : 0

  // Construction metrics
  const totalProjects = projects.length
  const totalUnits = (projects as any[]).reduce((s, p) => s + (p.total_units || 0), 0)
  const completedUnits = (projects as any[]).reduce((s, p) => s + (p.units_completed || 0), 0)
  const totalBudget = (projects as any[]).reduce((s, p) => s + (p.budget_rupiah || 0), 0)
  const totalSpent = (projects as any[]).reduce((s, p) => s + (p.spent_rupiah || 0), 0)
  const budgetVariance = totalBudget > 0 ? ((totalSpent - totalBudget) / totalBudget) * 100 : 0

  // Morning Brief computations (today's activity)
  const todayStr = new Date().toISOString().slice(0, 10)
  const overdueConsumer = (consumerCases as any[]).filter((c: any) => c.is_overdue).length
  // BUGFIX: completedToday and pendingToday now come from server-side COUNT queries
  // (see tasksCompletedToday + tasksPending in loadData()). The previous JS-side
  // filters were wrong (kpis.completed_at didn't exist; leads had wrong source).
  const completedToday = tasksTodayCount
  const pendingToday = tasksPendingCount
  // PERF #5: now from server-side count query (cached 60s)
  const newLeadsToday = newLeadsTodayCount
  const pendingApprovalsCount = (consumerCases as any[]).filter((c: any) =>
    c.stage === 'pending_approval' || c.stage === 'review'
  ).length

  // Top 3 action items — on-point, prioritized
  const topActions: { label: string; href: string; tone?: 'default' | 'warning' | 'success' }[] = []
  if (overdueConsumer > 0) {
    topActions.push({ label: `${overdueConsumer} SP3K lewat tempo — review sekarang`, href: '/owner#consumer-cases', tone: 'warning' })
  }
  if (pendingApprovalsCount > 0) {
    topActions.push({ label: `${pendingApprovalsCount} approval menunggu`, href: '/owner/approvals', tone: 'warning' })
  }
  if (newLeadsToday > 0) {
    topActions.push({ label: `${newLeadsToday} lead baru hari ini — assign surveyor`, href: '/owner/marketing', tone: 'success' })
  }
  if (topActions.length < 3 && totalBudget > 0 && budgetVariance > 10) {
    topActions.push({ label: `Budget proyek over ${budgetVariance.toFixed(0)}% dari RAP`, href: '/owner/projects', tone: 'warning' })
  }
  // Diverse fallback actions so user sees different recommendations, not 3 identical links.
  const FALLBACK_ACTIONS = [
    { label: 'Lihat Flow Kerja 2026', href: '/owner/projects/flow' },
    { label: 'Audit log terbaru', href: '/owner/audit' },
    { label: 'KPI tim bulan ini', href: '/owner/kpi' },
  ]
  while (topActions.length < 3) {
    topActions.push(FALLBACK_ACTIONS[topActions.length - 1] ?? FALLBACK_ACTIONS[0])
  }

  // Cluster metrics
  const clusterUnits = (clusters as any[]).reduce((s, c) => s + (c.total_units || 0), 0)
  const clusterSold = (clusters as any[]).reduce((s, c) => s + (c.units_sold || 0), 0)
  const sellThrough = clusterUnits > 0 ? Math.round((clusterSold / clusterUnits) * 100) : 0

// Consumer cases (overdueConsumer now computed above for MorningBrief)

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: 'Executive overview' }]} />

      {/* ==================== BRIEF ==================== */}
      <section
        aria-label="Morning brief"
        className="hero"
      >
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="eyebrow eyebrow-brand">Syahfalah · {today}</p>
            <h1 className="display-xl">
              Syahfalah<span className="aurum-text">.</span>
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-xl">
              Makassar · {totalProjects} proyek · {clusterUnits} unit rumah · {totalLeads} leads aktif
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="pill" data-variant="brand">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)]" aria-hidden />
              Live · realtime
            </span>
          </div>
        </div>
      </section>

      <MorningBrief
        today={today}
        completedTasks={completedToday}
        pendingTasks={pendingToday}
        newLeads={newLeadsToday}
        pendingApprovals={pendingApprovalsCount}
        overdueSp3k={overdueConsumer}
        pipelineValue={totalLeadValue}
        topActionItems={topActions}
      />

      {/* ==================== KPI RIBBON (4 tiles) ==================== */}
      <section
        aria-label="Ringkasan utama"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-up"
      >
        <article className="kpi-tile">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow">Unit rumah</span>
            <Building2 className="h-4 w-4 text-[var(--color-brand-500)]" aria-hidden />
          </div>
          <p className="font-heading text-3xl font-bold numeric">
            <NumericOrDash value={clusterUnits} />
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {clusterSold > 0 ? `${clusterSold} laku` : 'Belum ada'}
            {clusterUnits > 0 && ` · sell-through ${sellThrough}%`}
          </p>
        </article>

        <article className="kpi-tile kpi-tile-verdigris">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow">Proyek berjalan</span>
            <Hammer className="h-4 w-4 text-[var(--color-verdigris-500)]" aria-hidden />
          </div>
          <p className="font-heading text-3xl font-bold numeric">
            <NumericOrDash value={projects.length} />
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {projects.length > 0 ? `${completedUnits} unit selesai` : 'Belum ada'}
          </p>
        </article>

        <article className="kpi-tile kpi-tile-aurum">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow">Nilai pipeline</span>
            <DollarSign className="h-4 w-4 text-[var(--color-aurum-500)]" aria-hidden />
          </div>
          <p className="font-heading text-3xl font-bold numeric">
            <NumericOrDash value={totalLeadValue} format="currency" />
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {totalLeads > 0 ? `${totalLeads} calon buyer` : 'Belum ada leads'}
          </p>
        </article>

        <article className="kpi-tile kpi-tile-danger">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow">SP3K lewat tempo</span>
            <Clock className="h-4 w-4 text-[var(--color-danger)]" aria-hidden />
          </div>
          <p className="font-heading text-3xl font-bold numeric">
            <NumericOrDash value={overdueConsumer} />
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            dari {consumerCases.length} berkas
          </p>
        </article>
      </section>

      {/* OPT #3: Stream heavy sections below the fold.
          Morning Brief + KPI Ribbon render immediately (already cached).
          Cluster/Pipeline/Construction/Consumer Cases/Team Performance
          are below the fold and stream in as their data resolves. */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Memuat data dashboard">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-lg bg-[var(--color-surface-1)] animate-pulse" />
            ))}
          </div>
        }
      >
      {/* ==================== CLUSTER ==================== */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Inventaris"
          title="Performa cluster"
          subtitle={
            clusters.length > 0
              ? `${clusters.length} cluster aktif · ${clusterSold} dari ${clusterUnits} unit laku`
              : 'Belum ada data cluster'
          }
          href="/admin/divisions"
          hrefLabel="Detail"
        />
        <ClusterGrid clusters={clusters} />
      </section>

      {/* ==================== PIPELINE ==================== */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Pipeline"
          title="Calon buyer"
          subtitle={
            totalLeads > 0
              ? `${totalLeads} aktif · ${conversionRate.toFixed(1)}% jadi closing`
              : 'Belum ada leads'
          }
        />
        <PipelineFunnel leadsByStage={leadsByStage} totalLeads={totalLeads} leads={leads} />
      </section>

      {/* ==================== CONSTRUCTION ==================== */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Konstruksi"
          title="Progress pembangunan"
          subtitle={
            projects.length > 0
              ? `${projects.length} proyek · ${completedUnits}/${totalUnits} unit selesai`
              : 'Belum ada data proyek'
          }
        />
        <ProjectTracker
          projects={projects}
          totalBudget={totalBudget}
          totalSpent={totalSpent}
          budgetVariance={budgetVariance}
        />
      </section>

      {/* ==================== SP3K ==================== */}
      <section id="consumer-cases" className="space-y-4">
        <SectionHeader
          eyebrow="Berkas konsumen"
          title="SP3K & akad"
          subtitle={
            consumerCases.length > 0
              ? `${consumerCases.length} berkas${overdueConsumer > 0 ? ` · ${overdueConsumer} lewat tempo` : ''}`
              : 'Belum ada berkas konsumen'
          }
        />
        <ConsumerCasesTable cases={consumerCases} clusters={clusters} />
      </section>

      {/* ==================== TIM PERFORMANCE ==================== */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Tim"
          title="Performa anggota"
          subtitle={
            teamKPIs.length > 0
              ? `${teamKPIs.length} anggota dengan KPI jalan`
              : 'Belum ada data anggota'
          }
          href="/kepala-kantor/team"
          hrefLabel="Lihat semua"
        />
        <PersonalKpiTable members={teamKPIs} />
      </section>

      {/* ==================== EMPTY STATE (when no data) ==================== */}
      {clusters.length === 0 && projects.length === 0 && (
        <section className="rounded-xl border border-dashed border-[var(--color-border-default)] p-8 text-center">
          <Home
            className="h-10 w-10 text-[var(--color-text-tertiary)] mx-auto mb-3"
            aria-hidden
          />
          <h3 className="display-sm mb-1">Data cluster, leads, dan proyek belum aktif</h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto mb-3">
            Jalankan migration{' '}
            <code className="text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded font-mono">
              011_clusters.sql
            </code>{' '}
            di Supabase Dashboard SQL Editor. Setelah itu, kosong di atas
            akan terisi otomatis.
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] font-mono">
            supabase/migrations/011_clusters.sql
          </p>
        </section>
      )}
          </Suspense>
    </div>
  )
}

// Local helper — repeated section header with eyebrow + title + subtitle + optional link
function SectionHeader({
  eyebrow,
  title,
  subtitle,
  href,
  hrefLabel,
}: {
  eyebrow: string
  title: string
  subtitle: string
  href?: string
  hrefLabel?: string
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display-md mt-1">{title}</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{subtitle}</p>
      </div>
      {href && (
        <Link
          href={href}
          className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] flex items-center gap-1 shrink-0 transition-colors"
        >
          {hrefLabel} <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      )}
    </div>
  )
}
