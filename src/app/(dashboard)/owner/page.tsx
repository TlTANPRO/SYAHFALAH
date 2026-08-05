// app/owner/page.tsx
// Halaman ringkasan untuk Owner. Menampilkan progres cluster, pipeline
// leads, konstruksi, berkas konsumen SP3K, dan tim — semuanya dibaca
// dari Supabase. Kalau tabel belum ada (migration 011 belum jalan),
// tampil pesan ringkas, bukan placeholder kosong.

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import {
  ArrowUpRight,
  Building2,
  Clock,
  DollarSign,
  Hammer,
  Home,
} from 'lucide-react'
import { PersonalKpiTable } from '@/components/kpi/PersonalKpiTable'
import { KpiTrendChart } from '@/components/charts/KpiTrendChart'
import { PipelineFunnel } from '@/components/owner/PipelineFunnel'
import { ClusterGrid } from '@/components/owner/ClusterGrid'
import { ProjectTracker } from '@/components/owner/ProjectTracker'
import { ConsumerCasesTable } from '@/components/owner/ConsumerCasesTable'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

async function loadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { dbReady: false }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  async function safe<T>(query: any, fallback: T = [] as any): Promise<T> {
    try {
      const { data, error } = await query
      if (error) return fallback
      return (data ?? fallback) as T
    } catch {
      return fallback
    }
  }

  // ambil KPI trend: avg progress per divisi per bulan
  const trendQuery = sb
    .from('kpis')
    .select('division_id, period_start, progress')
    .in('level', ['division', 'company'])
    .gte('period_start', '2025-08-01')
    .lte('period_start', '2026-07-31')
    .limit(3000)

  const [kpiTrend, clusters, leads, projects, consumerCases, teamKPIs, divs] = await Promise.all([
    safe<any[]>(trendQuery, []),
    safe<any[]>(sb.from('clusters').select('*').eq('is_active', true).order('name')),
    safe<any[]>(sb.from('leads').select('id, stage, source, estimated_value_rupiah, created_at, cluster_id, customer_name, assigned_to_id, contacted_at, surveyed_at')),
    safe<any[]>(sb.from('projects').select('id, code, name, cluster_id, total_units, units_completed, start_date, target_completion_date, budget_rupiah, spent_rupiah, status, project_manager_id')),
    safe<any[]>(sb.from('consumer_cases').select('id, code, consumer_name, unit_code, cluster_id, stage, sp3k_deadline, bast_date, amount_rupiah, is_overdue, assigned_to_id')),
    safe<any[]>(sb.from('team_personal_kpis').select('user_id, name, position, division_id, division_name, kpi_count, avg_progress, achieved_count, on_track_count, at_risk_count, off_track_count').order('avg_progress', { ascending: false }).limit(12)),
    safe<any[]>(sb.from('divisions').select('id, name').eq('is_active', true).order('sort_order')),
  ])
  // group kpiTrend by division_id + period_start
  const trendMap = new Map<string, { sum: number; count: number }>()
  for (const r of kpiTrend as any[]) {
    if (r.progress == null) continue
    const period = (r.period_start as string).slice(0, 7) // YYYY-MM
    const key = `${r.division_id}::${period}`
    const cur = trendMap.get(key) ?? { sum: 0, count: 0 }
    cur.sum += r.progress
    cur.count += 1
    trendMap.set(key, cur)
  }

  return { clusters, leads, projects, consumerCases, teamKPIs, divisions: divs, kpiTrend, dbReady: true }
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
    teamKPIs = [],
    divisions = [],
    kpiTrend = [],
  } = data

  // KPI trend per divisi per bulan
  const trendByDiv = new Map<string, Map<string, { sum: number; count: number }>>()
  for (const r of kpiTrend as any[]) {
    if (r.progress == null) continue
    const period = (r.period_start as string).slice(0, 7)
    if (!trendByDiv.has(r.division_id)) trendByDiv.set(r.division_id, new Map())
    const m = trendByDiv.get(r.division_id)!
    const cur = m.get(period) ?? { sum: 0, count: 0 }
    cur.sum += r.progress
    cur.count += 1
    m.set(period, cur)
  }
  // collect all periods
  const periodSet = new Set<string>()
  for (const r of kpiTrend as any[]) {
    if (r.progress == null) continue
    periodSet.add((r.period_start as string).slice(0, 7))
  }
  const periods = Array.from(periodSet).sort()
  // pick top 5 divisions by data density
  const divDataCount = new Map<string, number>()
  for (const [divId, m] of trendByDiv) {
    let total = 0
    for (const v of m.values()) total += v.count
    divDataCount.set(divId, total)
  }
  const topDivs = Array.from(divDataCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)
  const divName = new Map((divisions as any[]).map(d => [d.id, d.name]))
  const kpiTrendSeries = topDivs.map(id => ({
    code: `D${id.slice(0, 4)}`,
    name: divName.get(id) ?? id.slice(0, 6),
  }))
  const kpiTrendData = periods.map(period => {
    const row: any = { label: period }
    for (const divId of topDivs) {
      const v = trendByDiv.get(divId)?.get(period)
      row[`D${divId.slice(0, 4)}`] = v ? +(v.sum / v.count).toFixed(1) : null
    }
    return row
  })

  // Hitung metrik pipeline
  const leadsByStage = (leads as any[]).reduce((acc: any, l: any) => {
    acc[l.stage] = (acc[l.stage] || 0) + 1
    return acc
  }, {})
  const totalLeads = leads.length
  const totalLeadValue = (leads as any[]).reduce((s, l) => s + (l.estimated_value_rupiah || 0), 0)
  const closedCount = (leadsByStage.closed || 0) + (leadsByStage.closing || 0)
  const conversionRate = totalLeads > 0 ? (closedCount / totalLeads) * 100 : 0

  // Hitung metrik konstruksi
  const totalUnits = (projects as any[]).reduce((s, p) => s + (p.total_units || 0), 0)
  const completedUnits = (projects as any[]).reduce((s, p) => s + (p.units_completed || 0), 0)
  const totalBudget = (projects as any[]).reduce((s, p) => s + (p.budget_rupiah || 0), 0)
  const totalSpent = (projects as any[]).reduce((s, p) => s + (p.spent_rupiah || 0), 0)
  const budgetVariance = totalBudget > 0 ? ((totalSpent - totalBudget) / totalBudget) * 100 : 0

  // Hitung metrik cluster
  const clusterUnits = (clusters as any[]).reduce((s, c) => s + (c.total_units || 0), 0)
  const clusterSold = (clusters as any[]).reduce((s, c) => s + (c.units_sold || 0), 0)
  const sellThrough = clusterUnits > 0 ? Math.round((clusterSold / clusterUnits) * 100) : 0

  // Berkas konsumen
  const overdueConsumer = (consumerCases as any[]).filter((c: any) => c.is_overdue).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
      <Breadcrumbs crumbs={ [{ label: 'Executive Overview' }] } />
        
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-1">
            Ringkasan Owner
          </p>
          <h1 className="display-lg">Syahfalah</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Makassar · {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
          </p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)]">Leads masuk</p>
            <p className="font-heading text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
              {totalLeads > 0 ? totalLeads : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)]">Closing minggu ini</p>
            <p className="font-heading text-2xl font-bold tabular-nums text-[var(--color-brand-500)]">
              {closedCount > 0 ? closedCount : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)]">Closing awal bulan</p>
            <p className="font-heading text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
              {conversionRate > 0 ? `${conversionRate.toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* 4 ringkasan utama */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-tile">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Unit rumah</span>
            <Building2 className="h-4 w-4 text-[var(--color-brand-500)]" />
          </div>
          <p className="font-heading text-3xl font-bold tabular-nums">{clusterUnits > 0 ? clusterUnits : '—'}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {clusterSold > 0 ? `${clusterSold} laku` : 'Belum ada'} · {clusterUnits > 0 ? `sell-through ${sellThrough}%` : '—'}
          </p>
        </div>
        <div className="kpi-tile kpi-tile-info">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Proyek berjalan</span>
            <Hammer className="h-4 w-4 text-[var(--color-info)]" />
          </div>
          <p className="font-heading text-3xl font-bold tabular-nums">{projects.length > 0 ? projects.length : '—'}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {projects.length > 0 ? `${completedUnits} unit selesai` : 'Belum ada'}
          </p>
        </div>
        <div className="kpi-tile kpi-tile-warning">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Nilai pipeline</span>
            <DollarSign className="h-4 w-4 text-[var(--color-warning)]" />
          </div>
          <p className="font-heading text-3xl font-bold tabular-nums">
            {totalLeadValue > 0 ? `Rp ${shortNumber(totalLeadValue)}` : '—'}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {totalLeads > 0 ? `${totalLeads} calon buyer` : 'Belum ada leads'}
          </p>
        </div>
        <div className="kpi-tile kpi-tile-danger">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">SP3K lewat tempo</span>
            <Clock className="h-4 w-4 text-[var(--color-danger)]" />
          </div>
          <p className="font-heading text-3xl font-bold tabular-nums">{overdueConsumer}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            dari {consumerCases.length} berkas
          </p>
        </div>
      </div>

      {/* Section: Cluster */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-md">Performa cluster</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {clusters.length > 0
              ? `${clusters.length} cluster aktif · ${clusterSold} dari ${clusterUnits} unit laku`
              : 'Belum ada data cluster'}
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

      {/* Section: Pipeline */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-md">Pipeline calon buyer</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {totalLeads > 0
              ? `${totalLeads} calon buyer aktif · Rp ${shortNumber(totalLeadValue)} nilai · ${conversionRate.toFixed(1)}% jadi closing`
              : 'Belum ada leads'}
          </p>
        </div>
      </div>
      <PipelineFunnel leadsByStage={leadsByStage} totalLeads={totalLeads} leads={leads} />

      {/* Section: Construction */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-md">Progress pembangunan</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {projects.length > 0
              ? `${projects.length} proyek · ${completedUnits}/${totalUnits} unit selesai`
              : 'Belum ada data proyek'}
          </p>
        </div>
      </div>
      <ProjectTracker projects={projects} totalBudget={totalBudget} totalSpent={totalSpent} budgetVariance={budgetVariance} />

      {/* Section: SP3K */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-md">Berkas konsumen</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {consumerCases.length > 0
              ? `${consumerCases.length} berkas berjalan · ${overdueConsumer} lewat tempo · di-handle Novita`
              : 'Belum ada berkas konsumen'}
          </p>
        </div>
      </div>
      <ConsumerCasesTable cases={consumerCases} clusters={clusters} />

      {/* Section: Tren KPI 12 bulan */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-md">Performa tim</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {teamKPIs.length > 0
              ? `${teamKPIs.length} anggota dengan KPI jalan`
              : 'Belum ada data anggota'}
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

      {/* Pesan ringkas kalau migration 011 belum jalan */}
      {clusters.length === 0 && projects.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-6 text-center">
          <Home className="h-10 w-10 text-[var(--color-text-tertiary)] mx-auto mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">
            Data cluster, leads, dan proyek belum aktif
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto mb-3">
            Jalankan migration <code className="text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded font-mono">011_clusters.sql</code> di Supabase Dashboard SQL Editor. Setelah itu, kosong di atas akan terisi otomatis.
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            File ada di <code className="font-mono">supabase/migrations/011_clusters.sql</code>
          </p>
        </div>
      )}
    </div>
  )
}
