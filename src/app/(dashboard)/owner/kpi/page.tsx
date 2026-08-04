// owner/kpi/page.tsx
// Daftar KPI strategis level 1 & 2. Filter yang ditampilkan: current year.

import { createClient } from '@supabase/supabase-js'
import { Target } from 'lucide-react'

interface KpiRow {
  id: string
  code: string | null
  name: string | null
  level: string
  unit: string | null
  baseline_target_value: number | null
  actual_value: number | null
  progress: number | null
  status: string | null
  period_start: string | null
  period_end: string | null
  division_id: string | null
}

async function load() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { kpis: [], divisions: [] }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [{ data: kpis }, { data: divs }] = await Promise.all([
    supabase
      .from('kpis')
      .select('id, code, name, level, unit, baseline_target_value, actual_value, progress, status, period_start, period_end, division_id')
      .in('level', ['company', 'division'])
      .order('progress', { ascending: false })
      .limit(100),
    supabase.from('divisions').select('id, name').eq('is_active', true),
  ])
  return { kpis: (kpis ?? []) as KpiRow[], divisions: (divs ?? []) as { id: string; name: string }[] }
}

const STATUS_VARIANT: Record<string, string> = {
  achieved: 'success',
  on_track: 'success',
  at_risk: 'warning',
  off_track: 'danger',
  pending: 'neutral',
}

const STATUS_LABEL: Record<string, string> = {
  achieved: 'Achieved',
  on_track: 'On Track',
  at_risk: 'At Risk',
  off_track: 'Off Track',
  pending: 'Pending',
}

function formatValue(v: number | null, unit: string | null): string {
  if (v == null) return '—'
  if (unit === 'IDR' || unit === 'Rp') {
    if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(1)}M`
    if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(0)}jt`
    return `Rp ${v.toLocaleString('id-ID')}`
  }
  if (unit === '%') return `${v}%`
  return `${v}${unit || ''}`
}

export default async function Page() {
  const { kpis, divisions } = await load()
  const divName = new Map(divisions.map(d => [d.id, d.name]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg">KPI Strategis</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Level 1 (company) dan Level 2 (divisi). Diurutkan dari progress tertinggi.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <h2 className="font-heading text-base font-semibold">{kpis.length} KPI aktif</h2>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>KPI</th>
              <th>Level</th>
              <th>Divisi</th>
              <th className="text-right">Progress</th>
              <th className="text-right">Target / Actual</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {kpis.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[var(--color-text-tertiary)] py-8">Belum ada KPI.</td></tr>
            ) : kpis.map(k => (
              <tr key={k.id}>
                <td>
                  <p className="font-medium">{k.name || '—'}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] font-mono">{k.code || '—'}</p>
                </td>
                <td>
                  <span className="pill" data-variant={k.level === 'company' ? 'info' : 'neutral'}>
                    {k.level}
                  </span>
                </td>
                <td className="text-sm text-[var(--color-text-secondary)]">
                  {k.division_id ? divName.get(k.division_id) || '—' : '—'}
                </td>
                <td className="text-right">
                  <span className="font-mono text-sm font-semibold">{k.progress != null ? `${Math.round(k.progress)}%` : '—'}</span>
                </td>
                <td className="text-right font-mono text-xs text-[var(--color-text-secondary)]">
                  {formatValue(k.baseline_target_value, k.unit)} / {formatValue(k.actual_value, k.unit)}
                </td>
                <td>
                  {k.status && (
                    <span className="pill" data-variant={STATUS_VARIANT[k.status] || 'neutral'}>
                      {STATUS_LABEL[k.status] || k.status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
