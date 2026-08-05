// app/(dashboard)/owner/twin/page.tsx
// Plan C Phase 1 Item 4 — Digital Twin overview page.
// Owner + Kepala Kantor see org-wide vitals (counts, cascade health,
// recent activity, alerts). Server fetches once on render; minimal
// interactivity. The "twin" metaphor = see the whole org as one entity.

import { createClient } from '@supabase/supabase-js'
import { Link2, AlertCircle, Activity, Users, Target, ListChecks, Briefcase, Building2 } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface OverviewResponse {
  generated_at: string
  counts: {
    users: number; active_users: number; divisions: number
    kpi_definitions: number; kpi_definitions_cascaded: number
    kpi_targets_year: number; tasks: number; tasks_active: number
    tasks_overdue: number; leads: number; leads_score_avg: number
  }
  cascade_health: {
    definitions_with_level: number; total_definitions: number; ratio: number
  }
  recent_tasks: Array<{
    id: string; title: string; status: string; due_date: string | null
    priority: string | null; created_at: string
  }>
  recent_kpis: Array<{
    id: string; code: string; name: string; level: string
    progress: number | null; status: string | null; period: string
  }>
}

async function loadOverview(): Promise<OverviewResponse | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  // Server-side fetch via service role for unified snapshot.
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const today = new Date().toISOString().slice(0, 10)
  const year = new Date().getFullYear()
  const monthStart = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`

  const [
    users, activeUsers, divisions, kpiDefs, kpiDefsCascaded,
    kpiTargetsYr, tasks, tasksActive, tasksOverdue,
    leads, leadsScores,
    recentTasks, recentKpis,
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('divisions').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('kpi_definitions').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('kpi_definitions').select('id', { count: 'exact', head: true })
      .eq('is_active', true).not('cascade_level', 'is', null),
    supabase.from('kpi_targets').select('id', { count: 'exact', head: true })
      .gte('period', `${year}-01`).lte('period', `${year}-12`),
    supabase.from('tasks').select('id', { count: 'exact', head: true }),
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .not('status', 'in', '(done,cancelled)'),
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .not('status', 'in', '(done,cancelled)').lt('due_date', today),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('score').not('score', 'is', null),
    supabase.from('tasks')
      .select('id, title, status, due_date, priority, created_at')
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('kpis')
      .select('id, code, name, level, progress, status, period')
      .gte('period', monthStart).order('progress', { ascending: true }).limit(8),
  ])

  const c = (r: any) => r?.count ?? 0
  const scoreArr: any[] = Array.isArray(leadsScores.data) ? leadsScores.data : []
  const scoreAvg = scoreArr.length > 0
    ? Math.round(scoreArr.reduce((s, x) => s + (Number(x.score) || 0), 0) / scoreArr.length)
    : 0

  return {
    generated_at: new Date().toISOString(),
    counts: {
      users: c(users), active_users: c(activeUsers), divisions: c(divisions),
      kpi_definitions: c(kpiDefs), kpi_definitions_cascaded: c(kpiDefsCascaded),
      kpi_targets_year: c(kpiTargetsYr), tasks: c(tasks),
      tasks_active: c(tasksActive), tasks_overdue: c(tasksOverdue),
      leads: c(leads), leads_score_avg: scoreAvg,
    },
    cascade_health: {
      definitions_with_level: c(kpiDefsCascaded),
      total_definitions: c(kpiDefs),
      ratio: c(kpiDefs) === 0 ? 0 : Math.round((c(kpiDefsCascaded) / c(kpiDefs)) * 100),
    },
    recent_tasks: (Array.isArray(recentTasks.data) ? recentTasks.data : []) as OverviewResponse['recent_tasks'],
    recent_kpis: (Array.isArray(recentKpis.data) ? recentKpis.data : []) as OverviewResponse['recent_kpis'],
  }
}

function fmtTs(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default async function DigitalTwinPage() {
  const overview = await loadOverview()

  if (!overview) {
    return (
      <div className="space-y-6">
        <Breadcrumbs crumbs={[{ label: 'Owner', href: '/owner' }, { label: 'Digital Twin' }]} />
        <div className="card"><div className="card-body text-center text-sm text-[var(--color-text-muted)]">
          Gagal memuat overview.
        </div></div>
      </div>
    )
  }

  const { counts, cascade_health, recent_tasks, recent_kpis } = overview

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: 'Owner', href: '/owner' }, { label: 'Digital Twin' }]} />

      <div>
        <h1 className="display-lg flex items-center gap-2">
          <Link2 className="h-6 w-6 text-[var(--color-brand-500)]" />
          Digital Twin
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Vitals satu-pandang untuk seluruh organisasi. Klik tile untuk drill ke halaman detail.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <a href="/admin/users" className="card hover:border-[var(--color-brand-500)] transition-colors">
          <div className="card-body">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Users</span>
            </div>
            <p className="text-3xl font-heading font-bold tabular-nums">{counts.active_users}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              dari {counts.users} total · {counts.divisions} divisi
            </p>
          </div>
        </a>
        <a href="/owner/kpi" className="card hover:border-[var(--color-brand-500)] transition-colors">
          <div className="card-body">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">KPI</span>
            </div>
            <p className="text-3xl font-heading font-bold tabular-nums">{counts.kpi_definitions}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              {counts.kpi_targets_year} target di {new Date().getFullYear()}
            </p>
          </div>
        </a>
        <a href="/admin/sow" className="card hover:border-[var(--color-brand-500)] transition-colors">
          <div className="card-body">
            <div className="flex items-center justify-between mb-2">
              <ListChecks className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Tasks</span>
            </div>
            <p className="text-3xl font-heading font-bold tabular-nums">{counts.tasks_active}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              aktif dari {counts.tasks} total
            </p>
          </div>
        </a>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-2">
              <Briefcase className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Leads</span>
            </div>
            <p className="text-3xl font-heading font-bold tabular-nums">{counts.leads}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              avg score {counts.leads_score_avg}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cascade health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--color-brand-500)]" />
              Cascade Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-heading font-bold tabular-nums">{cascade_health.ratio}%</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {cascade_health.definitions_with_level} / {cascade_health.total_definitions} KPI definition
                </span>
              </div>
              <div className="w-full h-2 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-brand-500)] transition-all"
                  style={{ width: `${cascade_health.ratio}%` }}
                />
              </div>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {cascade_health.ratio === 100
                  ? 'Semua KPI sudah di-cascade.'
                  : `${cascade_health.total_definitions - cascade_health.definitions_with_level} definition belum di-cascade. Lihat `}
                {cascade_health.ratio !== 100 && (
                  <a href="/owner/targets" className="text-[var(--color-brand-500)] hover:underline">
                    Target Cascade
                  </a>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Tasks overdue</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Lewat due date dan belum selesai</p>
                </div>
                <span className="text-2xl font-heading font-bold tabular-nums text-amber-500">
                  {counts.tasks_overdue}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-[var(--color-surface-2)]/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">KPI definitions belum cascade</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Tidak punya parent / level</p>
                </div>
                <span className="text-2xl font-heading font-bold tabular-nums text-[var(--color-text-tertiary)]">
                  {counts.kpi_definitions - cascade_health.definitions_with_level}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-[var(--color-surface-2)]/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Tasks aktif</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Belum done / cancelled</p>
                </div>
                <span className="text-2xl font-heading font-bold tabular-nums text-[var(--color-text-tertiary)]">
                  {counts.tasks_active}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-[var(--color-brand-500)]" />
              Tasks terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent_tasks.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">Belum ada tasks.</p>
            ) : (
              <ul className="space-y-2">
                {recent_tasks.map(t => (
                  <li key={t.id} className="flex items-start gap-3 text-sm">
                    <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${priorityColor(t.priority)}`} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{t.title}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">
                        {t.status} · {fmtTs(t.due_date ?? t.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent KPIs at risk */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-[var(--color-brand-500)]" />
              KPI butuh perhatian
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent_kpis.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">Belum ada KPI bulan ini.</p>
            ) : (
              <ul className="space-y-2">
                {recent_kpis.map(k => (
                  <li key={k.id} className="flex items-start gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{k.name}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
                        {k.code} · {k.period}
                      </p>
                    </div>
                    <Badge variant={progressVariant(k.progress)}>
                      {k.progress != null ? `${k.progress.toFixed(0)}%` : '—'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-[10px] text-[var(--color-text-tertiary)] text-right">
        Generated {new Date(overview.generated_at).toLocaleString('id-ID')} · refresh dengan reload
      </p>
    </div>
  )
}

function priorityColor(p: string | null): string {
  if (p === 'urgent' || p === 'high') return 'bg-rose-500'
  if (p === 'medium') return 'bg-amber-500'
  return 'bg-[var(--color-surface-3)]'
}

function progressVariant(p: number | null): 'default' | 'success' | 'warning' | 'destructive' {
  if (p == null) return 'default'
  if (p >= 80) return 'success'
  if (p >= 50) return 'default'
  if (p >= 25) return 'warning'
  return 'destructive'
}
