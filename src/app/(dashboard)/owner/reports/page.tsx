// owner/reports/page.tsx
// Executive summary report. Aggregates real KPI / task data from the
// division summary views into a single printable page.

import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users, CheckCircle2 } from 'lucide-react'


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
  if (!url || !key) return { task: [], kpi: [] }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [{ data: task }, { data: kpi }] = await Promise.all([
    supabase.from('division_task_summary').select('*'),
    supabase.from('division_kpi_summary').select('*'),
  ])
  return {
    task: (task ?? []) as DivisionTaskSummary[],
    kpi: (kpi ?? []) as DivisionKpiSummary[],
  }
}

export default async function Page() {
  const { task, kpi } = await load()

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Executive Reports</h1>
          <p className="text-muted-foreground">Ringkasan eksekutif · {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
        </div>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-xs uppercase tracking-wide">Task Completion</span>
            </div>
            <div className="font-heading text-2xl font-bold tabular-nums">{companyCompletionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{totalCompleted} / {totalTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs uppercase tracking-wide">Avg KPI Progress</span>
            </div>
            <div className="font-heading text-2xl font-bold tabular-nums">{avgProgress}%</div>
            <p className="text-xs text-muted-foreground mt-1">{totalAchieved} achieved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs uppercase tracking-wide">Active Tasks</span>
            </div>
            <div className="font-heading text-2xl font-bold tabular-nums">{totalInProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-xs uppercase tracking-wide text-destructive">Overdue</span>
            </div>
            <div className="font-heading text-2xl font-bold tabular-nums text-destructive">{totalOverdue}</div>
            <p className="text-xs text-muted-foreground mt-1">tasks</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per Divisi — Task</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-foreground">Divisi</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Selesai</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Progress</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Pending</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {task.map(t => (
                  <tr key={t.division_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{t.division_name}</td>
                    <td className="p-3 text-right tabular-nums">{t.total_tasks}</td>
                    <td className="p-3 text-right tabular-nums text-success">{t.completed_count}</td>
                    <td className="p-3 text-right tabular-nums">{t.completion_rate != null ? `${Math.round(t.completion_rate)}%` : '—'}</td>
                    <td className="p-3 text-right tabular-nums">{t.pending_count}</td>
                    <td className="p-3 text-right tabular-nums">
                      {t.overdue_count > 0 ? (
                        <Badge variant="destructive">{t.overdue_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per Divisi — KPI</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-foreground">Divisi</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">KPI</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Avg Progress</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Achieved</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">On Track</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">At Risk</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Off Track</th>
                </tr>
              </thead>
              <tbody>
                {kpi.map(k => (
                  <tr key={k.division_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{k.division_name}</td>
                    <td className="p-3 text-right tabular-nums">{k.kpi_count}</td>
                    <td className="p-3 text-right tabular-nums">{k.avg_progress != null ? `${Math.round(k.avg_progress)}%` : '—'}</td>
                    <td className="p-3 text-right tabular-nums text-success">{k.achieved_count}</td>
                    <td className="p-3 text-right tabular-nums">{k.on_track_count}</td>
                    <td className="p-3 text-right tabular-nums text-warning">{k.at_risk_count}</td>
                    <td className="p-3 text-right tabular-nums text-destructive">{k.off_track_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
