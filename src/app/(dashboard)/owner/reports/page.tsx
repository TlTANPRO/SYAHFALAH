// owner/reports/page.tsx
// Laporan eksekutif. Print-friendly. Pakai design tokens baru.

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { TrendingUp, Users, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'
import { ReportsClient } from './ReportsClient'

interface DivisionTaskSummary {
  division_id: string
  division_name: string
  total_tasks: number
  completed_count: number
  in_progress_count: number
  pending_count: number
  overdue_count: number
  completion_rate: number | null
}

interface DivisionKpiSummary {
  division_id: string
  division_name: string
  kpi_count: number
  avg_progress: number | null
  achieved_count: number
  on_track_count: number
  at_risk_count: number
  off_track_count: number
}

async function load() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { task: [], kpi: [], divisions: [], total: 0 }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [{ data: task }, { data: kpi }, { data: divisions, count }] = await Promise.all([
    supabase.from('division_task_summary').select('*').neq('division_name', 'Test Seed'),
    supabase.from('division_kpi_summary').select('*').neq('division_name', 'Test Seed').neq('division_code', 'TEST_SEED'),
    supabase.from('divisions').select('id, name, description, created_at', { count: 'exact' }).neq('name', 'Test Seed').order('name').range(0, 11),
  ])
  return {
    task: (task ?? []) as DivisionTaskSummary[],
    kpi: (kpi ?? []) as DivisionKpiSummary[],
    divisions: (divisions ?? []) as any[],
    total: count ?? 0,
  }
}

export default async function Page() {
  const { task, kpi, divisions, total } = await load()

  const totalTasks = task.reduce((s, t) => s + t.total_tasks, 0)
  const totalCompleted = task.reduce((s, t) => s + t.completed_count, 0)
  const totalOverdue = task.reduce((s, t) => s + t.overdue_count, 0)
  const totalInProgress = task.reduce((s, t) => s + t.in_progress_count, 0)
  const totalKpis = kpi.reduce((s, k) => s + k.kpi_count, 0)
  const totalAchieved = kpi.reduce((s, k) => s + k.achieved_count, 0)
  const avgProgress = kpi.length
    ? Math.round(kpi.reduce((s, k) => s + (k.avg_progress || 0), 0) / kpi.length)
    : 0
  const companyCompletionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0

  return (
    <div className="space-y-6 print:space-y-4">
      <div>
        <h1 className="display-lg">Laporan Eksekutif</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Ringkasan keseluruhan perusahaan · {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-tile">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--color-text-tertiary)]">Task selesai</span>
            <CheckCircle2 className="h-4 w-4 text-[var(--color-brand-500)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{companyCompletionRate}%</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{totalCompleted} dari {totalTasks} task</p>
        </div>
        <div className="kpi-tile kpi-tile-info">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--color-text-tertiary)]">Rata-rata KPI</span>
            <TrendingUp className="h-4 w-4 text-[var(--color-info)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{avgProgress}%</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{totalAchieved} dari {totalKpis} achieved</p>
        </div>
        <div className="kpi-tile kpi-tile-warning">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--color-text-tertiary)]">Task berjalan</span>
            <Users className="h-4 w-4 text-[var(--color-warning)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{totalInProgress}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">in progress</p>
        </div>
        <div className="kpi-tile kpi-tile-danger">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--color-text-tertiary)]">Lewat tempo</span>
            <AlertCircle className="h-4 w-4 text-[var(--color-danger)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{totalOverdue}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">perlu tindak lanjut</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <h2 className="font-heading text-base font-semibold">Task per divisi</h2>
        </div>
        <div className="overflow-x-auto"><table className="data-table">
          <thead>
            <tr>
              <th>Divisi</th>
              <th className="text-right">Total</th>
              <th className="text-right">Selesai</th>
              <th className="text-right">Progress</th>
              <th className="text-right">Pending</th>
              <th className="text-right">Lewat tempo</th>
            </tr>
          </thead>
          <tbody>
            {task.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[var(--color-text-tertiary)] py-8">Belum ada data task.</td></tr>
            ) : task.map(t => (
              <tr key={t.division_id}>
                <td className="font-medium">
                  <Link
                    href={`/divisi/${t.division_id}`}
                    className="group inline-flex items-center gap-1 text-[var(--color-brand-500)] hover:underline"
                  >
                    {t.division_name}
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </td>
                <td className="text-right tabular-nums">{t.total_tasks}</td>
                <td className="text-right tabular-nums text-[var(--color-success)]">{t.completed_count}</td>
                <td className="text-right tabular-nums">{t.completion_rate != null ? `${Math.round(t.completion_rate)}%` : '—'}</td>
                <td className="text-right tabular-nums">{t.pending_count}</td>
                <td className="text-right">
                  {t.overdue_count > 0 ? (
                    <span className="pill" data-variant="danger">{t.overdue_count}</span>
                  ) : (
                    <span className="text-[var(--color-text-tertiary)]">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <h2 className="font-heading text-base font-semibold">KPI per divisi</h2>
        </div>
        <div className="overflow-x-auto"><table className="data-table">
          <thead>
            <tr>
              <th>Divisi</th>
              <th className="text-right">KPI</th>
              <th className="text-right">Avg progress</th>
              <th className="text-right">Achieved</th>
              <th className="text-right">On track</th>
              <th className="text-right">At risk</th>
              <th className="text-right">Off track</th>
            </tr>
          </thead>
          <tbody>
            {kpi.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-[var(--color-text-tertiary)] py-8">Belum ada data KPI.</td></tr>
            ) : kpi.map(k => (
              <tr key={k.division_id}>
                <td className="font-medium">
                  <Link
                    href={`/divisi/${k.division_id}`}
                    className="group inline-flex items-center gap-1 text-[var(--color-brand-500)] hover:underline"
                  >
                    {k.division_name}
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </td>
                <td className="text-right tabular-nums">{k.kpi_count}</td>
                <td className="text-right tabular-nums">{k.avg_progress != null ? `${Math.round(k.avg_progress)}%` : '—'}</td>
                <td className="text-right tabular-nums text-[var(--color-success)]">{k.achieved_count}</td>
                <td className="text-right tabular-nums">{k.on_track_count}</td>
                <td className="text-right tabular-nums text-[var(--color-warning)]">{k.at_risk_count}</td>
                <td className="text-right tabular-nums text-[var(--color-danger)]">{k.off_track_count}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <div className="space-y-3">
        <h2 className="font-heading text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--color-brand-500)]" /> Direktori Divisi
        </h2>
        <ReportsClient initialData={divisions} total={total} />
      </div>
    </div>
  )
}
