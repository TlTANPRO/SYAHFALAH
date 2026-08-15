// personal/[userId]/page.tsx
// Manager drilldown view — 1-on-1 page manager untuk satu staff tertentu.
// Diakses dari TeamGrid. Akses:
//   - owner / kepala_kantor: lihat siapa saja
//   - pic_divisi: lihat anggota divisinya
//   - staff: hanya profil sendiri (userId == session.userId)
//   - self fallback: kalau tidak ada session, redirect ke /login
//
// Konten:
//   - Hero profil (nama, posisi, divisi, status aktif)
//   - Stats: KPI aktif, task pending, overdue, today
//   - KPI list (individual KPIs, level 'personal')
//   - Active tasks (status pending/in_progress/overdue)
//   - Recent activity (tasks done / approvals — 5 each)

import { createClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Target,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  Shield,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { HeroSection } from '@/components/layout/HeroSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/layout/StatCard'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { EmptyState } from '@/components/ui/empty-state'
import { getSession } from '@/lib/api/auth-guard'

interface PageProps {
  params: Promise<{ userId: string }>
}

async function load(userId: string, viewer: {
  userId: string
  role: string
  divisionId?: string | null
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return { error: 'config' as const, data: null }
  }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // fetch target user
  const { data: userRow } = await sb
    .from('users')
    .select('id, full_name, role, position, division_id, is_active, last_login_at, email, divisions:division_id(id, name, code)')
    .eq('id', userId)
    .maybeSingle()

  if (!userRow) return { error: 'notfound' as const, data: null }

  // access enforcement
  if (viewer.role === 'staff' && viewer.userId !== userId) {
    return { error: 'forbidden' as const, data: null }
  }
  if (viewer.role === 'pic_divisi') {
    if (viewer.userId === userId) {
      // ok — viewing self
    } else if (!viewer.divisionId || viewer.divisionId !== userRow.division_id) {
      return { error: 'forbidden' as const, data: null }
    }
  }

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000)
  const todayIso = todayStart.toISOString()
  const tomorrowIso = tomorrowStart.toISOString()
  const todayDate = todayIso.slice(0, 10)

  const [
    kpiRes,
    activeTasksRes,
    pendingTaskCountRes,
    overdueTaskCountRes,
    doneTodayTaskCountRes,
    recentDoneRes,
    recentApprovalsRes,
  ] = await Promise.all([
    sb
      .from('kpis')
      .select('id, code, name, target_value, actual_value, progress, status, unit, period_start')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(20),
    sb
      .from('tasks')
      .select('id, title, status, priority, due_date, scheduled_date, completed_at, is_carry_over')
      .eq('user_id', userId)
      .in('status', ['pending', 'in_progress', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(15),
    sb
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending'),
    sb
      .from('tasks')
      .select('id, due_date')
      .eq('user_id', userId)
      .neq('status', 'done')
      .neq('status', 'cancelled')
      .lt('due_date', todayDate),
    sb
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('completed_at', todayIso)
      .lt('completed_at', tomorrowIso),
    sb
      .from('tasks')
      .select('id, title, completed_at, priority')
      .eq('user_id', userId)
      .eq('status', 'done')
      .order('completed_at', { ascending: false })
      .limit(5),
    sb
      .from('approvals')
      .select('id, title, kind, status, created_at, decided_at')
      .or(`requester_id.eq.${userId},approver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // compute overdue count from data
  const overdueRows = overdueTaskCountRes.data ?? []
  const overdueCount = overdueRows.length

  const division = Array.isArray(userRow.divisions)
    ? userRow.divisions[0]
    : userRow.divisions

  return {
    error: null,
    data: {
      user: userRow,
      division,
      kpis: kpiRes.data ?? [],
      activeTasks: activeTasksRes.data ?? [],
      pendingCount: pendingTaskCountRes.count ?? 0,
      overdueCount,
      doneTodayCount: doneTodayTaskCountRes.count ?? 0,
      recentDone: recentDoneRes.data ?? [],
      recentApprovals: recentApprovalsRes.data ?? [],
      fetchError: Boolean(
        kpiRes.error ||
          activeTasksRes.error ||
          pendingTaskCountRes.error ||
          overdueTaskCountRes.error ||
          doneTodayTaskCountRes.error ||
          recentDoneRes.error ||
          recentApprovalsRes.error,
      ),
    },
  }
}

function statusAccent(status: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (status === 'achieved' || status === 'done' || status === 'completed') return 'success'
  if (status === 'on_track' || status === 'in_progress') return 'info'
  if (status === 'at_risk' || status === 'overdue' || status === 'pending') return 'warning'
  if (status === 'off_track' || status === 'cancelled') return 'danger'
  return 'neutral'
}

function priorityVariant(priority: string | null): 'danger' | 'warning' | 'info' | 'neutral' {
  if (priority === 'critical') return 'danger'
  if (priority === 'high') return 'warning'
  if (priority === 'medium') return 'info'
  return 'neutral'
}

export default async function PersonalDetailPage({ params }: PageProps) {
  const { userId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const result = await load(userId, {
    userId: session.userId,
    role: session.role,
    divisionId: session.divisionId,
  })

  if (result.error === 'config') {
    return (
      <div className="space-y-6">
        <Breadcrumbs crumbs={[{ label: 'Personal' }, { label: 'Detail' }]} />
        <EmptyState
          icon={Shield}
          eyebrow="Konfigurasi"
          title="Server belum dikonfigurasi"
          description="SUPABASE_SERVICE_ROLE_KEY tidak ditemukan. Hubungi admin."
        />
      </div>
    )
  }

  if (result.error === 'forbidden') {
    return (
      <div className="space-y-6">
        <Breadcrumbs crumbs={[{ label: 'Personal' }, { label: 'Detail' }]} />
        <EmptyState
          icon={Shield}
          eyebrow="Akses ditolak"
          title="Anda tidak punya akses ke halaman ini"
          description="Hanya manager (owner/kepala_kantor/pic_divisi) yang dapat membuka detail anggota tim di luar divisi sendiri."
          action={{ label: 'Kembali', href: '/' }}
        />
      </div>
    )
  }

  if (result.error === 'notfound' || !result.data) notFound()

  const { user, division, kpis, activeTasks, pendingCount, overdueCount, doneTodayCount, recentDone, recentApprovals } = result.data

  const todayDate = new Date().toISOString().slice(0, 10)

  const fullName = (user.full_name as string).trim()
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()

  return (
    <div className="space-y-8">
      <Breadcrumbs
        crumbs={[
          { label: 'Personal' },
          { label: division?.name ?? 'Tanpa divisi', href: division ? `/divisi/${division.id}` : undefined },
          { label: fullName },
        ]}
      />

      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-500)] transition-colors"
      >
        <ChevronLeft className="h-3 w-3" />
        Dashboard
      </Link>

      {/* Hero profil */}
      <HeroSection
        eyebrow={<>
          <Target className="inline h-3 w-3 mr-1" aria-hidden /> Personal · {division?.code ?? 'No-Div'}
        </>}
        title={
          <div className="flex items-center gap-4">
            <div
              className="h-14 w-14 rounded-full bg-[var(--color-brand-500)]/15 text-[var(--color-brand-500)] flex items-center justify-center font-heading font-semibold text-lg"
              aria-hidden="true"
            >
              {initials}
            </div>
            <span className="display-lg">{fullName}</span>
          </div>
        }
        subtitle={`${user.position ?? user.role}${division ? ` · ${division.name}` : ''}${user.is_active ? '' : ' · Non-aktif'}`}
        pills={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="pill" data-variant="brand">{user.role}</span>
            {user.last_login_at && (
              <span className="pill" data-variant="neutral">
                Login terakhir {formatDate(user.last_login_at)}
              </span>
            )}
          </div>
        }
      />

      {/* Stats */}
      <section
        aria-label="Ringkasan"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-item"
      >
        <StatCard
          label="KPI aktif"
          value={kpis.length}
          accent="brand"
          hint={kpis.length > 0 ? `${kpis.filter((k: any) => k.status === 'achieved' || Number(k.progress) >= 100).length} tercapai` : undefined}
          icon={Target}
        />
        <StatCard
          label="Task pending"
          value={pendingCount}
          accent={pendingCount > 0 ? 'warning' : 'neutral'}
          icon={ListTodo}
        />
        <StatCard
          label="Task lewat tempo"
          value={overdueCount}
          accent={overdueCount > 0 ? 'danger' : 'success'}
          icon={AlertCircle}
        />
        <StatCard
          label="Selesai hari ini"
          value={doneTodayCount}
          accent={doneTodayCount > 0 ? 'success' : 'neutral'}
          icon={CheckCircle2}
        />
      </section>

      {/* KPI personal */}
      <section>
        <PageHeader
          eyebrow="KPI"
          title={<h2 className="display-md">KPI Personal</h2>}
          subtitle={`${kpis.length} target aktif. Update terakhir oleh sistem.`}
        />
        {kpis.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>KPI</th>
                    <th>Periode</th>
                    <th className="text-right">Target</th>
                    <th className="text-right">Actual</th>
                    <th className="text-right">Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((k: any) => {
                    const progress = Number(k.progress) || 0
                    const accent = statusAccent(k.status)
                    return (
                      <tr key={k.id}>
                        <td>
                          <p className="font-medium">{k.name}</p>
                          <p className="text-xs text-[var(--color-text-tertiary)] font-mono">{k.code}</p>
                        </td>
                        <td className="text-sm text-[var(--color-text-secondary)] font-mono">
                          {k.period_start ? formatDate(k.period_start) : '—'}
                        </td>
                        <td className="text-right tabular-nums font-mono text-sm">
                          {k.target_value ?? '—'}{k.unit ? ` ${k.unit}` : ''}
                        </td>
                        <td className="text-right tabular-nums font-mono text-sm">
                          {k.actual_value ?? '—'}{k.unit ? ` ${k.unit}` : ''}
                        </td>
                        <td className="text-right tabular-nums font-mono font-semibold">
                          {progress.toFixed(1)}%
                        </td>
                        <td>
                          <span className="pill" data-variant={accent}>{k.status ?? 'pending'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Target}
            eyebrow="KPI"
            title="Belum ada KPI personal"
            description={`${fullName} belum memiliki target KPI personal. Tambahkan melalui menu Admin > KPI Definition.`}
            action={{ label: 'Buka KPI Library', href: '/kpi' }}
          />
        )}
      </section>

      {/* Active tasks */}
      <section>
        <PageHeader
          eyebrow="Task"
          title={<h2 className="display-md">Task Aktif</h2>}
          subtitle="Yang sedang berjalan atau terlambat."
        />
        {activeTasks.length > 0 ? (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-[var(--color-border-default)]">
              {activeTasks.map((t: any) => {
                const accent = statusAccent(t.status)
                const dueLabel = t.due_date
                  ? formatDate(t.due_date)
                  : 'Tanpa tanggal'
                const overdue = t.due_date && t.due_date < todayDate && t.status !== 'done'
                return (
                  <li key={t.id} className="px-4 py-3 flex items-start gap-3">
                    <Clock className={`h-4 w-4 mt-0.5 ${overdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-tertiary)]'}`} aria-hidden />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="pill" data-variant={accent}>{t.status}</span>
                        <span className={`pill ${overdue ? 'pill-danger' : ''}`} data-variant={overdue ? 'danger' : 'neutral'}>
                          {dueLabel}
                        </span>
                        {t.is_carry_over && (
                          <span className="pill" data-variant="warning">Carry-over</span>
                        )}
                        <span className="pill" data-variant={priorityVariant(t.priority)}>
                          {t.priority ?? 'medium'}
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <EmptyState
            icon={CheckCircle2}
            eyebrow="Task"
            title="Tidak ada task aktif"
            description={`${fullName} sudah menyelesaikan semua task aktif. Kerja bagus!`}
          />
        )}
      </section>

      {/* Bottom row: recent done + recent approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent done */}
        <section>
          <PageHeader
            eyebrow="Aktivitas"
            title={<h3 className="display-sm">5 task terakhir selesai</h3>}
            subtitle="Riwayat singkat, sorted by completion time."
          />
          {recentDone.length > 0 ? (
            <div className="card overflow-hidden">
              <ul className="divide-y divide-[var(--color-border-default)]">
                {recentDone.map((t: any) => (
                  <li key={t.id} className="px-4 py-3 flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-[var(--color-verdigris-500)]" aria-hidden />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)] font-mono mt-0.5">
                        {t.completed_at ? formatDate(t.completed_at) : '—'}
                      </p>
                    </div>
                    <span className="pill" data-variant={priorityVariant(t.priority)}>
                      {t.priority ?? 'medium'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              eyebrow="Aktivitas"
              title="Belum ada task selesai"
              variant="compact"
            />
          )}
        </section>

        {/* Recent approvals */}
        <section>
          <PageHeader
            eyebrow="Approval"
            title={<h3 className="display-sm">5 approval terakhir</h3>}
            subtitle="Request yang dibuat atau perlu di-approve."
          />
          {recentApprovals.length > 0 ? (
            <div className="card overflow-hidden">
              <ul className="divide-y divide-[var(--color-border-default)]">
                {recentApprovals.map((a: any) => (
                  <li key={a.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-[var(--color-text-tertiary)] font-mono mt-0.5">
                          {a.created_at ? formatDate(a.created_at) : '—'} · {a.kind}
                        </p>
                      </div>
                      <span className="pill" data-variant={statusAccent(a.status)}>
                        {a.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              icon={Shield}
              eyebrow="Approval"
              title="Belum ada approval"
              variant="compact"
            />
          )}
        </section>
      </div>
    </div>
  )
}
