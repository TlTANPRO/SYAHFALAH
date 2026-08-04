// app/owner/page.tsx
// Owner Executive Dashboard — premium command center
// Composed of: company KPIs, cluster grid, leads pipeline, project tracker,
// team KPIs, and revenue chart.

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Hammer,
  Home,
  TrendingUp,
  Users,
} from 'lucide-react'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils'
import { PersonalKpiTable } from '@/components/kpi/PersonalKpiTable'
import { PipelineFunnel } from '@/components/owner/PipelineFunnel'
import { ClusterGrid } from '@/components/owner/ClusterGrid'
import { ProjectTracker } from '@/components/owner/ProjectTracker'
import { ConsumerCasesTable } from '@/components/owner/ConsumerCasesTable'

async function loadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { hasDb: false, as: new Date().toISOString() }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // Safe query helper — returns empty array if table doesn't exist
  async function safe<T>(query: any, fallback: T = [] as any): Promise<T> {
    try {
      const { data, error } = await query
      if (error) {
        console.warn('Query error:', error.message)
        return fallback
      }
      return (data ?? fallback) as T
    } catch {
      return fallback
    }
  }

  // Parallel queries
  const [clusters, leads, projects, consumerCases,divTaskSummary, companyKpis, teamKPIs] = await Promise.all([
    safe<any[]>(sb.from('clusters').select('*').eq('is_active', true).order('name')),
    safe<any[]>(sb.from('leads').select('id, stage, estimated_value_rupiah, created_at, source, cluster_id, customer_name, assigned_to_id, contacted_at, surveyed_at')),
    safe<any[]>(sb.from('projects').select('id, code, name, cluster_id, total_units, units_completed, start_date, target_completion_date, budget_rupiah, spent_rupiah, status, project_manager_id')),
    safe<any[]>(sb.from('consumer_cases').select('id, code, consumer_name, unit_code, cluster_id, stage, sp3k_deadline, bast_date, amount_rupiah, is_overdue, assigned_to_id')),
    safe<any[]>(sb.from('division_task_summary').select('division_id, division_name, total_tasks, completed_count, in_progress_count, pending_count, overdue_count, completion_rate')),
    safe<any[]>(sb.from('kpis').select('id, code, name, level, unit, baseline_target_value, actual_value, progress, status, period_start, period_end').eq('level', 'company').order('period_start', { ascending: false }).limit(3)),
    safe<any[]>(sb.from('team_personal_kpis').select('user_id, name, position, division_id, division_name, kpi_count, avg_progress, achieved_count, on_track_count, at_risk_count, off_track_count').order('avg_progress', { ascending: false }).limit(12)),
  ])

  return {
    clusters,
    leads,
    projects,
    consumerCases,
    divTaskSummary,
    companyKpis,
    teamKPIs,
    dbReady: true,
  }
}

function shortNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}M`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}jt`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}rb`
  return String(n)
}

export default async function Page() {
  const data = await loadData()
  const {
    clusters = [],
    leads = [],
    projects = [],
    consumerCases = [],
    divTaskSummary = [],
    companyKpis = [],
    teamKPIs = [],
  } = data

  // Compute pipeline metrics
  const leadsByStage = (leads as any[]).reduce((acc: any, l: any) => {
    acc[l.stage] = (acc[l.stage] || 0) + 1
    return acc
  }, {})
  const totalLeads = leads.length
  const totalLeadValue = (leads as any[]).reduce((s, l) => s + (l.estimated_value_rupiah || 0), 0)
  const closedCount = (leadsByStage.closed || 0) + (leadsByStage.closing || 0)
  const conversionRate = totalLeads > 0 ? (closedCount / totalLeads) * 100 : 0

  // Project metrics
  const totalUnits = (projects as any[]).reduce((s, p) => s + (p.total_units || 0), 0)
  const completedUnits = (projects as any[]).reduce((s, p) => s + (p.units_completed || 0), 0)
  const totalBudget = (projects as any[]).reduce((s, p) => s + (p.budget_rupiah || 0), 0)
  const totalSpent = (projects as any[]).reduce((s, p) => s + (p.spent_rupiah || 0), 0)
  const budgetVariance = totalBudget > 0 ? ((totalSpent - totalBudget) / totalBudget) * 100 : 0

  // Cluster metrics
  const clusterUnits = (clusters as any[]).reduce((s, c) => s + (c.total_units || 0), 0)
  const clusterSold = (clusters as any[]).reduce((s, c) => s + (c.units_sold || 0), 0)
  const sellThrough = clusterUnits > 0 ? Math.round((clusterSold / clusterUnits) * 100) : 0

  // Consumer cases (SP3K tracker)
  const consumerByStage = (consumerCases as any[]).reduce((acc: any, c: any) => {
    acc[c.stage] = (acc[c.stage] || 0) + 1
    return acc
  }, {})
  const overdueConsumer = (consumerCases as any[]).filter((c: any) => c.is_overdue).length

  // Company KPIs (latest 3 periods)
  const latestCompanyKPIs = (companyKpis as any[])
    .reduce((acc: any[], k: any) => {
      if (!acc.find((x) => x.code === k.code)) acc.push(k)
      return acc
    }, [])
    .slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-1">
            Executive Dashboard
          </p>
          <h1 className="display-lg">Syahfalah</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Makassar · {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-xs text-[var(--color-text-tertiary)]">Leads Bulan Ini</p>
            <p className="font-heading text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
              {totalLeads > 0 ? totalLeads : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--color-text-tertiary)]">Closing (Pipeline)</p>
            <p className="font-heading text-2xl font-bold tabular-nums text-[var(--color-brand-500)]">
              {closedCount > 0 ? closedCount : '—'}
            </p>
          </div>
          <div className="text-rights">
            <p className="text-xs text-[var(--color-text-tertiary)]">Conversion</p>
            <p className="font-heading text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
              {conversionRate > 0 ? `${conversionRate.toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Hero metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-tile">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Total Units</span>
            <Building2 className="h-4 w-4 text-[var(--color-brand-500)]" />
          </div>
          <p className="font-heading text-3xl font-bold tabular-nums">{clusterUnits || '—'}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {clusterSold || 0} sold · {clusterUnits > 0 ? `${sellThrough}%` : '—'} sell-through
          </p>
        </div>
        <div className="kpi-tile kpi-tile-info">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Active Projects</span>
            <Hammer className="h-4 w-4 text-[var(--color-info)]" />
          </div>
          <p className="font-heading text-3xl font-bold tabular-nums">{projects.length || '—'}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {projects.length > 0 ? `${completedUnits} units delivered` : 'Belum ada data'}
          </p>
        </div>
        <div className="kpi-tile kpi-tile-warning">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Pipeline Value</span>
            <DollarSign className="h-4 w-4 text-[var(--color-warning)]" />
          </div>
          <p className="font-heading text-3xl font-bold tabular-nums">
            {totalLeadValue > 0 ? `Rp ${shortNumber(totalLeadValue)}` : '—'}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {totalLeads > 0 ? `${totalLeads} leads aktif` : 'Belum ada leads'}
          </p>
        </div>
        <div className="kpi-tile kpi-tile-danger">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">SP3K Overdue</span>
            <Clock className="h-4 w-4 text-[var(--color-danger)]" />
          </div>
          <p className="font-heading text-3xl font-bold tabular-nums">{overdueConsumer}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            dari {consumerCases.length} kasus
          </p>
        </div>
      </div>

      {/* Section: Cluster Performance */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-md">Cluster Performance</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {clusters.length} cluster aktif · {clusterSold} dari {clusterUnits} unit terjual
          </p>
        </div>
        <Link
          href="/admin/divisions"
          className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
        >
          Detail <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <ClusterGrid clusters={clusters} />

      {/* Section: Pipeline Funnel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-md">Sales Pipeline</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {totalLeads} leads aktif · Rp {shortNumber(totalLeadValue)} nilai pipeline · {conversionRate.toFixed(1)}% conversion
          </p>
        </div>
      </div>
      <PipelineFunnel leadsByStage={leadsByStage} totalLeads={totalLeads} />

      {/* Section: Construction Tracker */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-md">Construction Tracker</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {projects.length} proyek · {completedUnits}/{totalUnits} unit selesai
          </p>
        </div>
      </div>
      <ProjectTracker projects={projects} totalBudget={totalBudget} totalSpent={totalSpent} budgetVariance={budgetVariance} />

      {/* Section: Consumer Cases (SP3K tracker) */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-md">Consumer Cases</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {consumerCases.length} kasus aktif · {overdueConsumer} overdue · handled by Novita
          </p>
        </div>
      </div>
      <ConsumerCasesTable cases={consumerCases} clusters={clusters} />

      {/* Section: Team KPIs */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-md">Team Performance</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Top performers · {teamKPIs.length} anggota dengan KPI aktif
          </p>
        </div>
        <Link
          href="/kepala-kantor/team"
          className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
        >
          Lihat semua <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <PersonalKpiTable members={teamKPIs} />

      {/* Empty state hint if migration not applied */}
      {clusters.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-6 text-center">
          <Home className="h-10 w-10 text-[var(--color-text-tertiary)] mx-auto mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">Data cluster & leads belum tersedia</h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto mb-3">
            Migration <code className="text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded font-mono">
              supabase/migrations/011_clusters.sql
            </code> perlu diaplikasikan di Supabase Dashboard untuk aktivasi data cluster, leads, projects, dan consumer cases.
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Lihat <code className="font-mono">SECURITY.md</code> untuk instruksi.
          </p>
        </div>
      )}
    </div>
  )
}
