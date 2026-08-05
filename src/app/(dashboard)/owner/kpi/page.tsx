// owner/kpi/page.tsx
// KPI strategis level perusahaan + divisi. Server component fetches
// initial data + summary stats, then hands off to <KpiListClient>
// for search/filter/pagination.

import { createClient } from '@supabase/supabase-js'
import { KpiListClient, type KpiRow } from './KpiListClient'

async function loadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return { rows: [] as KpiRow[], divisions: [] as { id: string; name: string }[], periods: [] as string[], total: 0 }
  }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const year = new Date().getFullYear()

  const [{ data: kpis, count }, { data: divs }] = await Promise.all([
    supabase
      .from('kpis')
      .select('id, code, name, level, unit, division_id, baseline_target_value, actual_value, progress, status, period', { count: 'exact' })
      .in('level', ['company', 'division'])
      .gte('period', `${year}-01`)
      .lte('period', `${year}-12`)
      .order('progress', { ascending: false })
      .range(0, 24),
    supabase.from('divisions').select('id, name').eq('is_active', true).order('sort_order'),
  ])

  const rows = (kpis ?? []) as KpiRow[]
  // Derive periods list from the rows (most recent first)
  const periodsSet = new Set<string>()
  for (const r of rows) {
    if (r.period) periodsSet.add(r.period)
  }
  const periods = Array.from(periodsSet).sort().reverse()

  return {
    rows,
    divisions: (divs ?? []) as { id: string; name: string }[],
    periods,
    total: count ?? 0,
  }
}

export default async function Page() {
  const { rows, divisions, periods, total } = await loadData()

  // Summary KPIs derived from current page (good-enough approximation
  // for the four hero cards — exact totals aren't critical here).
  const achieved = rows.filter(r => r.status === 'achieved').length
  const onTrack = rows.filter(r => r.status === 'on_track').length
  const atRisk = rows.filter(r => r.status === 'at_risk' || r.status === 'off_track').length

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
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums">{total}</p>
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

      <KpiListClient
        divisions={divisions}
        periods={periods}
        initialData={rows}
        total={total}
      />
    </div>
  )
}
