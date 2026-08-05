// owner/kpi/page.tsx
// KPI strategis level perusahaan + divisi. Dikumpulkan dari semua
// period aktif, diagregat per definisi.

import { createClient } from '@supabase/supabase-js'
import { Target, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { formatValue } from '@/lib/format'

interface KpiRow {
  id: string
  code: string | null
  name: string | null
  level: string
  unit: string | null
  division_id: string | null
  baseline_target_value: number | null
  actual_value: number | null
  progress: number | null
  status: string | null
  period_start: string
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

async function loadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { rows: [] as KpiRow[], divisions: [] as { id: string; name: string }[] }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const year = new Date().getFullYear()

  const [{ data: kpis }, { data: divs }] = await Promise.all([
    supabase
      .from('kpis')
      .select('id, code, name, level, unit, division_id, baseline_target_value, actual_value, progress, status, period_start')
      .in('level', ['company', 'division'])
      .gte('period_start', `${year}-01-01`)
      .lte('period_start', `${year}-12-31`)
      .order('progress', { ascending: false })
      .limit(200),
    supabase.from('divisions').select('id, name').eq('is_active', true).order('sort_order'),
  ])
  return {
    rows: (kpis ?? []) as KpiRow[],
    divisions: (divs ?? []) as { id: string; name: string }[],
  }
}

export default async function Page() {
  const { rows, divisions } = await loadData()
  const divName = new Map(divisions.map(d => [d.id, d.name]))

  // Group by KPI code → keep latest period
  const grouped = new Map<string, KpiRow>()
  for (const r of rows) {
    const key = r.code ?? r.id
    if (!grouped.has(key)) grouped.set(key, r)
  }
  const uniq = Array.from(grouped.values()).sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))

  const achieved = uniq.filter(r => r.status === 'achieved').length
  const onTrack = uniq.filter(r => r.status === 'on_track').length
  const atRisk = uniq.filter(r => r.status === 'at_risk' || r.status === 'off_track').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg">KPI Strategis</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Level 1 (perusahaan) dan Level 2 (divisi). Diurutkan dari progress tertinggi.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Total KPI</p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums">{uniq.length}</p>
          </div>
        </div>
        <div className="card bg-emerald-500/10">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Tercapai</p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-emerald-500">{achieved}</p>
          </div>
        </div>
        <div className="card bg-sky-500/10">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">On track</p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-sky-500">{onTrack}</p>
          </div>
        </div>
        <div className="card bg-amber-500/10">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Perlu perhatian</p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-amber-500">{atRisk}</p>
          </div>
        </div>
      </div>

      {uniq.length === 0 ? (
        <EmptyState
        icon={ Target }
        title="Belum ada KPI strategis di periode aktif."
        description=""
      />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto"><table className="data-table">
            <thead>
              <tr>
                <th>KPI</th>
                <th>Level</th>
                <th>Divisi</th>
                <th className="text-right">Progress</th>
                <th className="text-right">Target</th>
                <th className="text-right">Actual</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {uniq.map(k => (
                <tr key={k.id}>
                  <td>
                    <Link
                      href={k.code ? `/kpi/${encodeURIComponent(k.code)}` : `/kpi/${k.id}`}
                      className="group inline-flex items-center gap-1 text-[var(--color-brand-500)] hover:underline"
                      aria-label={`Buka detail ${k.code ?? k.name ?? 'KPI'}`}
                    >
                      <div>
                        <p className="font-medium">{k.name}</p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mt-0.5 group-hover:text-[var(--color-brand-500)]">{k.code}</p>
                      </div>
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </Link>
                  </td>
                  <td className="text-sm">
                    <span className="pill" data-variant={k.level === 'company' ? 'brand' : 'neutral'}>
                      {k.level === 'company' ? 'Perusahaan' : 'Divisi'}
                    </span>
                  </td>
                  <td className="text-sm text-[var(--color-text-secondary)]">
                    {k.division_id ? divName.get(k.division_id) ?? '—' : '—'}
                  </td>
                  <td className="text-right tabular-nums font-mono font-semibold">
                    {k.progress != null ? `${k.progress.toFixed(0)}%` : '—'}
                  </td>
                  <td className="text-right tabular-nums font-mono text-sm">
                    {formatValue(k.baseline_target_value, k.unit)}
                  </td>
                  <td className="text-right tabular-nums font-mono text-sm">
                    {formatValue(k.actual_value, k.unit)}
                  </td>
                  <td>
                    {k.status && (
                      <span className="pill" data-variant={STATUS_VARIANT[k.status] ?? 'neutral'}>
                        {STATUS_LABEL[k.status] ?? k.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  )
}
