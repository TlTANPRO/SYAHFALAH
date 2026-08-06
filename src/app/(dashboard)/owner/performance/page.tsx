// app/(dashboard)/owner/performance/page.tsx
// Plan C Phase 3 — Performance scoring page.
// Aggregates per-user metrics + ranks.

import { createClient } from '@supabase/supabase-js'
import { Trophy, TrendingUp, Activity } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExportCsvButton } from '@/components/ui/ExportCsvButton'

interface Score {
  user_id: string
  user_name: string
  division_name: string | null
  tasks_total: number
  tasks_on_time: number
  tasks_completion_rate: number | null
  kpis_count: number
  kpi_avg_progress: number | null
  attendance_total: number
  attendance_present_rate: number | null
  overall_score: number | null
  rank: number | null
}

async function load() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { scores: [], computedAt: new Date().toISOString() }

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // Pull users + 30-day attendance + tasks summary + KPI view
  const [users, tasks, kpi, att] = await Promise.all([
    sb.from('users').select('id, full_name, division_id, divisions(name)').eq('is_active', true).order('full_name'),
    sb.from('tasks').select('user_id, is_overdue, status').limit(5000),
    sb.from('team_personal_kpis').select('user_id, progress_percentage').limit(2000),
    sb.from('attendance_logs').select('user_id, status').gte(
      'log_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    ),
  ])

  const userList = (users.data ?? []) as unknown as Array<{ id: string; full_name: string; division_id: string | null; divisions: { name: string } | null }>
  if (userList.length === 0) return { scores: [], computedAt: new Date().toISOString() }

  const kpiByUser = new Map<string, number[]>()
  for (const k of (kpi.data ?? []) as unknown as Array<{ user_id: string; progress_percentage: number | null }>) {
    if (k.progress_percentage == null) continue
    const arr = kpiByUser.get(k.user_id) ?? []
    arr.push(Number(k.progress_percentage))
    kpiByUser.set(k.user_id, arr)
  }

  const taskAgg = new Map<string, { total: number; onTime: number }>()
  for (const t of (tasks.data ?? []) as unknown as Array<{ user_id: string; is_overdue: boolean; status: string }>) {
    const a = taskAgg.get(t.user_id) ?? { total: 0, onTime: 0 }
    a.total++
    if (t.status === 'completed' && !t.is_overdue) a.onTime++
    taskAgg.set(t.user_id, a)
  }

  const attAgg = new Map<string, { total: number; present: number }>()
  for (const a of (att.data ?? []) as unknown as Array<{ user_id: string; status: string }>) {
    const x = attAgg.get(a.user_id) ?? { total: 0, present: 0 }
    x.total++
    if (a.status === 'present' || a.status === 'late') x.present++
    attAgg.set(a.user_id, x)
  }

  const scores: Score[] = userList.map(u => {
    const t = taskAgg.get(u.id) ?? { total: 0, onTime: 0 }
    const taskRate = t.total > 0 ? (t.onTime / t.total) * 100 : null
    const kpiArr = kpiByUser.get(u.id) ?? []
    const kpiAvg = kpiArr.length > 0 ? kpiArr.reduce((s, v) => s + v, 0) / kpiArr.length : null
    const a = attAgg.get(u.id) ?? { total: 0, present: 0 }
    const attRate = a.total > 0 ? (a.present / a.total) * 100 : null

    const parts: number[] = []
    parts.push((taskRate ?? 50) * 0.4)
    parts.push((kpiAvg ?? 50) * 0.4)
    parts.push((attRate ?? 50) * 0.2)

    return {
      user_id: u.id,
      user_name: u.full_name,
      division_name: (u.divisions as any)?.name ?? null,
      tasks_total: t.total,
      tasks_on_time: t.onTime,
      tasks_completion_rate: taskRate ? Math.round(taskRate) : null,
      kpis_count: kpiArr.length,
      kpi_avg_progress: kpiAvg ? Math.round(kpiAvg) : null,
      attendance_total: a.total,
      attendance_present_rate: attRate ? Math.round(attRate) : null,
      overall_score: Math.round(parts.reduce((s, v) => s + v, 0)),
      rank: null,
    }
  })

  scores.sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0))
  scores.forEach((s, i) => { s.rank = i + 1 })

  return { scores, computedAt: new Date().toISOString() }
}

function scoreBadge(s: number): { variant: 'success' | 'warning' | 'destructive' | 'default'; label: string } {
  if (s >= 85) return { variant: 'success', label: 'Excellent' }
  if (s >= 70) return { variant: 'default', label: 'On-track' }
  if (s >= 55) return { variant: 'warning', label: 'At-risk' }
  return { variant: 'destructive', label: 'Off-track' }
}

export default async function PerformancePage() {
  const { scores, computedAt } = await load()
  const top3 = scores.slice(0, 3)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, x) => s + (x.overall_score ?? 0), 0) / scores.length) : 0

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: 'Owner', href: '/owner' }, { label: 'Performance' }]} />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="display-lg flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[var(--color-brand-500)]" />
            Performance Scoring
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Skor agregat per user: 40% tasks + 40% KPI + 20% attendance (30 hari).
          </p>
        </div>
        <ExportCsvButton
          filename={`performance-${computedAt.slice(0, 10)}.csv`}
          rows={scores.map(s => ({
            Rank: s.rank ?? '',
            Name: s.user_name,
            Division: s.division_name ?? '',
            Overall: s.overall_score ?? '',
            TasksOnTime: `${s.tasks_on_time}/${s.tasks_total}`,
            TasksPct: s.tasks_completion_rate ?? '',
            KpiAvgPct: s.kpi_avg_progress ?? '',
            AttendancePct: s.attendance_present_rate ?? '',
          }))}
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
              <Activity className="inline h-3.5 w-3.5 mr-1" /> Rata-rata skor
            </p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums">{avgScore}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
              <Trophy className="inline h-3.5 w-3.5 mr-1" /> Top performer
            </p>
            <p className="mt-2 text-lg font-heading font-bold">{top3[0]?.user_name ?? '—'}</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">{top3[0]?.overall_score ?? 0} poin · {top3[0]?.division_name ?? '—'}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
              Total head-count
            </p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums">{scores.length}</p>
          </div>
        </div>
      </div>

      {/* Top 3 leaderboard */}
      {top3.length > 0 && top3[0] && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> Top 3 bulan ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {top3.map((s, i) => {
                const badge = scoreBadge(s.overall_score ?? 0)
                return (
                  <div key={s.user_id} className="card">
                    <div className="card-body">
                      <div className="flex items-center justify-between">
                        <Badge variant={badge.variant as any}>{`#${i + 1}`}</Badge>
                        <span className="text-2xl font-heading font-bold tabular-nums">{s.overall_score}</span>
                      </div>
                      <p className="mt-2 font-medium">{s.user_name}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">{s.division_name ?? '—'}</p>
                      <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] text-[var(--color-text-tertiary)]">
                        <div>
                          <p className="font-mono">{s.tasks_completion_rate ?? '—'}%</p>
                          <p>tasks</p>
                        </div>
                        <div>
                          <p className="font-mono">{s.kpi_avg_progress ?? '—'}%</p>
                          <p>KPI</p>
                        </div>
                        <div>
                          <p className="font-mono">{s.attendance_present_rate ?? '—'}%</p>
                          <p>att</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full ranking table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Semua user ({scores.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2)] border-b border-[var(--color-border-subtle)]">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Rank</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Division</th>
                <th className="px-4 py-2 font-medium text-right">Skor</th>
                <th className="px-4 py-2 font-medium text-right">Tasks</th>
                <th className="px-4 py-2 font-medium text-right">KPI</th>
                <th className="px-4 py-2 font-medium text-right">Attendance</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {scores.map(s => {
                const badge = scoreBadge(s.overall_score ?? 0)
                return (
                  <tr key={s.user_id} className="hover:bg-[var(--color-surface-1)]">
                    <td className="px-4 py-2 font-mono text-[var(--color-text-secondary)]">#{s.rank}</td>
                    <td className="px-4 py-2 font-medium">{s.user_name}</td>
                    <td className="px-4 py-2 text-[var(--color-text-tertiary)]">{s.division_name ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{s.overall_score ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-xs">
                      <span className="font-mono">{s.tasks_on_time}/{s.tasks_total}</span>
                      <span className="text-[var(--color-text-tertiary)]"> ({s.tasks_completion_rate ?? 0}%)</span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{s.kpi_avg_progress ?? '—'}%</td>
                    <td className="px-4 py-2 text-right font-mono">{s.attendance_present_rate ?? '—'}%</td>
                    <td className="px-4 py-2">
                      <Badge variant={badge.variant as any}>{badge.label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
