// app/(dashboard)/kpi/[code]/page.tsx
// Drill-down detail view untuk satu KPI definition. Shows all 12
// monthly targets + actuals for current year, mini-trend chart, formula,
// thresholds, and meta (level, unit, direction, owner via division).

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Target, ChevronRight, ArrowLeft, Info } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { formatValue, formatDelta, timeAgo } from '@/lib/format'
import { createClient } from '@supabase/supabase-js'

const STATUS_VARIANT: Record<string, string> = {
  achieved: 'success', on_track: 'info', at_risk: 'warning', off_track: 'danger',
}
const STATUS_LABEL: Record<string, string> = {
  achieved: 'Tercapai', on_track: 'On track', at_risk: 'At risk', off_track: 'Off track',
}

interface PageProps {
  params: Promise<{ code: string }>
}

async function loadKpi(code: string) {
  // Decode (KPI-URL-encoded / KPI-COMP-REVENUE)
  const decoded = decodeURIComponent(code)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: def, error: defErr } = await supabase
    .from('kpi_definitions')
    .select('*, division:divisions(name, code)')
    .eq('code', decoded)
    .single()

  if (defErr || !def) return null

  const currentYear = new Date().getFullYear()
  const { data: targets } = await supabase
    .from('kpi_targets')
    .select('id, period, target_value, status, approved_at, actuals:kpi_actuals(actual_value, recorded_at, is_verified, notes)')
    .eq('kpi_definition_id', def.id)
    .order('period', { ascending: false })
    .limit(60)

  // Latest actual for trend
  const latestActualWithTs = (targets ?? [])
    .flatMap(t => (t.actuals ?? []).map(a => ({ ...a, period: t.period })))
    .sort((a, b) => b.period.localeCompare(a.period))[0]

  // Aggregate progress for header
  const monthsWithActuals = (targets ?? []).filter(t => (t.actuals ?? []).length > 0)
  const avgProgress = monthsWithActuals.length
    ? monthsWithActuals.reduce((sum, t) => {
        const act = t.actuals?.[0]
        if (!act || t.target_value === 0) return sum
        return sum + (Number(act.actual_value) / Number(t.target_value)) * 100
      }, 0) / monthsWithActuals.length
    : null

  return {
    def,
    targets: targets ?? [],
    currentYear,
    latestActual: latestActualWithTs ?? null,
    avgProgress,
    monthsWithActuals: monthsWithActuals.length,
    totalMonths: (targets ?? []).length,
  }
}

export default async function Page({ params }: PageProps) {
  const { code } = await params
  const data = await loadKpi(code)
  if (!data) notFound()

  const { def, targets, latestActual, avgProgress, monthsWithActuals, totalMonths } = data
  const divName = (def.division as any)?.name ?? null

  // Progress bar color
  const progressColor =
    avgProgress == null
      ? 'bg-[var(--color-surface-2)]'
      : avgProgress >= (def.threshold_green ?? 80)
      ? 'bg-[var(--color-success)]'
      : avgProgress >= (def.threshold_yellow ?? 60)
      ? 'bg-[var(--color-warning)]'
      : 'bg-[var(--color-danger)]'

  return (
    <div className="space-y-6">
      <Breadcrumbs
        crumbs={[
          { label: 'KPI Explorer', href: '/kpi' },
          { label: def.code },
        ]}
      />

      <div>
        <Link
          href="/kpi"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-500)] transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" /> Kembali ke KPI Explorer
        </Link>
        <h1 className="display-lg">{def.name}</h1>
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] mt-1">
          {def.code}
        </p>
      </div>

      {/* Hero: status, progress, latest */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Level</p>
              <p className="font-heading font-semibold capitalize">{def.level}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Divisi</p>
              <p className="font-heading font-semibold">{divName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Target tahunan</p>
              <p className="font-heading font-semibold">{formatValue(def.target_value, def.unit)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Periode</p>
              <p className="font-heading font-semibold capitalize">{def.target_period ?? 'monthly'}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs text-[var(--color-text-tertiary)]">Progress tahun ini</p>
              <p className="text-2xl font-bold tabular-nums">
                {avgProgress != null ? `${avgProgress.toFixed(1)}%` : '—'}
              </p>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden" role="progressbar"
                 aria-valuenow={avgProgress ?? 0} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={`h-full transition-all duration-500 ease-out ${progressColor}`}
                style={{ width: `${Math.min(100, avgProgress ?? 0)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] font-mono text-[var(--color-text-tertiary)]">
              <span>{def.threshold_yellow ?? 60}% (yellow)</span>
              <span>{def.threshold_green ?? 80}% (green)</span>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
              {monthsWithActuals} dari {totalMonths} bulan terisi
              {latestActual && (
                <> • terakhir: <span className="font-mono">{latestActual.period}</span> = {formatValue(Number(latestActual.actual_value), def.unit)} ({timeAgo(latestActual.recorded_at)})</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Formula + meta */}
      {def.formula && (
        <div className="card">
          <div className="card-body flex items-start gap-3">
            <Info className="h-4 w-4 text-[var(--color-brand-500)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Formula</p>
              <p className="font-mono text-sm">{def.formula}</p>
              {def.description && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-2">{def.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monthly trend table */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--color-brand-500)]" />
          <h2 className="font-heading font-semibold">Trend Bulanan</h2>
          <span className="text-xs text-[var(--color-text-tertiary)] ml-auto">12 bulan terakhir</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Periode</th>
                <th className="text-right">Target</th>
                <th className="text-right">Actual</th>
                <th className="text-right">Progress</th>
                <th>Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {targets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-sm text-[var(--color-text-secondary)]">
                    Belum ada target untuk KPI ini.
                  </td>
                </tr>
              ) : (
                targets.map(t => {
                  const act = (t.actuals ?? [])[0]
                  const actVal = act ? Number(act.actual_value) : null
                  const progress = actVal != null && t.target_value > 0
                    ? (actVal / Number(t.target_value)) * 100
                    : null
                  return (
                    <tr key={t.id}>
                      <td className="font-mono text-sm">{t.period}</td>
                      <td className="text-right tabular-nums font-mono text-sm">
                        {formatValue(Number(t.target_value), def.unit)}
                      </td>
                      <td className="text-right tabular-nums font-mono text-sm">
                        {act ? formatValue(actVal, def.unit) : '—'}
                      </td>
                      <td className="text-right tabular-nums font-mono text-sm font-semibold">
                        {progress != null ? `${progress.toFixed(1)}%` : '—'}
                      </td>
                      <td>
                        {progress != null && (
                          <span className="pill" data-variant={
                            progress >= (def.threshold_green ?? 80) ? 'success' :
                            progress >= (def.threshold_yellow ?? 60) ? 'warning' : 'danger'
                          }>
                            {progress >= (def.threshold_green ?? 80) ? 'On track' :
                             progress >= (def.threshold_yellow ?? 60) ? 'At risk' : 'Off track'}
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-[var(--color-text-tertiary)]">
                        {act ? timeAgo(act.recorded_at) : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
