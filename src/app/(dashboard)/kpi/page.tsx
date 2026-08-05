// kpi/page.tsx
// KPI Explorer — daftar KPI definitif (satu row per definisi), agregat
// rata-rata progress dari semua periodenya. Plus filter divisi + level.

import { createClient } from '@supabase/supabase-js'
import { Target, ChevronRight, Filter } from 'lucide-react'
import Link from 'next/link'
import { ExportKpiButton } from '@/components/kpi/ExportKpiButton'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { KpiExplorerClient } from './KpiExplorerClient'
import { KpiTable } from './KpiTable'
import { formatValue } from '@/lib/format'

interface KpiRow {
  id: string
  code: string | null
  name: string | null
  level: string
  unit: string | null
  division_id: string | null
}

interface PeriodRollup {
  kpi_id: string
  period_start: string
  period_end: string
  baseline_target_value: number | null
  actual_value: number | null
  progress: number | null
  status: string | null
}

interface AggregatedKpi {
  code: string
  name: string
  level: string
  unit: string | null
  division_id: string | null
  periods: number
  avgProgress: number | null
  avgActual: number | null
  latestTarget: number | null
  latestActual: number | null
  latestProgress: number | null
  latestStatus: string | null
}

const STATUS_VARIANT: Record<string, string> = {
  achieved: 'success',
  on_track: 'info',
  at_risk: 'warning',
  off_track: 'danger',
}
const STATUS_LABEL: Record<string, string> = {
  achieved: 'Tercapai',
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
}
const LEVEL_LABEL: Record<string, string> = {
  company: 'Perusahaan',
  division: 'Divisi',
  personal: 'Personal',
}

async function loadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { kpis: [] as AggregatedKpi[], divisions: [] as { id: string; name: string }[] }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const [{ data: defs }, { data: rollups }, { data: divs }] = await Promise.all([
    supabase
      .from('kpis')
      .select('id, code, name, level, unit, division_id')
      .order('code')
      .limit(500),
    supabase
      .from('kpis')
      .select('id, code, name, baseline_target_value, actual_value, progress, status, period_start, period_end, level, unit, division_id')
      .order('period_start', { ascending: false })
      .limit(2000),
    supabase.from('divisions').select('id, name').eq('is_active', true).order('sort_order'),
  ])

  // group rollups by KPI id
  const byId = new Map<string, AggregatedKpi>()
  for (const d of defs ?? []) {
    byId.set(d.id, {
      code: d.code ?? '—',
      name: d.name ?? '—',
      level: d.level,
      unit: d.unit,
      division_id: d.division_id,
      periods: 0,
      avgProgress: null,
      avgActual: null,
      latestTarget: null,
      latestActual: null,
      latestProgress: null,
      latestStatus: null,
    })
  }

  // walk rollups to compute avg + latest
  const rollupByKpi = new Map<string, PeriodRollup[]>()
  for (const r of rollups ?? []) {
    if (!byId.has(r.id)) continue
    if (!rollupByKpi.has(r.id)) rollupByKpi.set(r.id, [])
    rollupByKpi.get(r.id)!.push({
      kpi_id: r.id,
      period_start: r.period_start,
      period_end: r.period_end,
      baseline_target_value: r.baseline_target_value,
      actual_value: r.actual_value,
      progress: r.progress,
      status: r.status,
    })
  }

  for (const [kpiId, list] of rollupByKpi) {
    const agg = byId.get(kpiId)!
    agg.periods = list.length
    const progresses = list.map(r => r.progress).filter((v): v is number => v != null)
    const actuals = list.map(r => r.actual_value).filter((v): v is number => v != null)
    agg.avgProgress = progresses.length ? progresses.reduce((a, b) => a + b, 0) / progresses.length : null
    agg.avgActual = actuals.length ? actuals.reduce((a, b) => a + b, 0) / actuals.length : null
    // latest
    const latest = list[0] // sorted desc by period_start
    if (latest) {
      agg.latestTarget = latest.baseline_target_value
      agg.latestActual = latest.actual_value
      agg.latestProgress = latest.progress
      agg.latestStatus = latest.status
    }
  }

  return {
    kpis: Array.from(byId.values()).filter(k => k.periods > 0),
    divisions: (divs ?? []) as { id: string; name: string }[],
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ division?: string; level?: string }>
}) {
  const { kpis, divisions } = await loadData()
  const sp = (await searchParams) ?? {}
  const filterDivision = sp.division
  const filterLevel = sp.level

  const divName = new Map(divisions.map(d => [d.id, d.name]))
  const filtered = kpis.filter(k => {
    if (filterDivision && k.division_id !== filterDivision) return false
    if (filterLevel && k.level !== filterLevel) return false
    return true
  })

  const byLevel: Record<string, AggregatedKpi[]> = {}
  for (const k of filtered) {
    if (!byLevel[k.level]) byLevel[k.level] = []
    byLevel[k.level].push(k)
  }
  const levels = Object.keys(byLevel).sort()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
      <Breadcrumbs crumbs={ [{ label: 'KPI Explorer' }] } />
        
          <h1 className="display-lg">KPI Explorer</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {filtered.length} definisi KPI, diagregat dari semua period aktif.
          </p>
        </div>
        <ExportKpiButton rows={filtered} divisions={divisions} />
      </div>

            <KpiExplorerClient
        divisions={divisions}
        filterDivision={filterDivision}
        filterLevel={filterLevel}
        totalCount={kpis.length}
        levelCounts={{
          company: kpis.filter(k => k.level === 'company').length,
          division: kpis.filter(k => k.level === 'division').length,
          personal: kpis.filter(k => k.level === 'personal').length,
        }}
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-12 text-center">
          <Target className="h-12 w-12 text-[var(--color-text-tertiary)] mx-auto mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)]">Tidak ada KPI yang cocok dengan filter.</p>
          <Link href="/kpi" className="text-xs text-[var(--color-brand-500)] hover:underline mt-2 inline-block">
            Reset filter
          </Link>
        </div>
      ) : (
        levels.map(level => (
          <section key={level}>
            <header className="mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-[var(--color-brand-500)]" />
              <h2 className="display-md">{LEVEL_LABEL[level] || level}</h2>
              <span className="pill" data-variant="neutral">{byLevel[level].length}</span>
            </header>
            <KpiTable rows={byLevel[level]} divisions={divisions} />
          </section>
        ))
      )}
    </div>
  )
}
