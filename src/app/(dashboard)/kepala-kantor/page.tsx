// kepala-kantor/page.tsx
// Halaman Kepala Kantor — semua divisi + performa tim + ritme kerja.
// Server-side fetch (sesuai pola /kepala-kantor/team/page.tsx) supaya
// query `team_personal_kpis` jalan via service_role key dan bukan
// anon (yang return 401 karena RLS deny users).

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import {
  Target,
  Building2,
  ClipboardList,
  Shield,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { HeroSection } from '@/components/layout/HeroSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/layout/StatCard'
import { PersonalKpiTable } from '@/components/kpi/PersonalKpiTable'
import { TeamGrid, loadTeamData } from '@/components/manager/TeamGrid'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'

const DIVISION_ICON: Record<string, React.ReactNode> = {
  MARKETING: <Target className="h-4 w-4" />,
  FINANCE: <ClipboardList className="h-4 w-4" />,
  CONSTRUCTION: <Building2 className="h-4 w-4" />,
  MAINTENANCE: <Shield className="h-4 w-4" />,
  MEDIA: <FileText className="h-4 w-4" />,
  PURCHASING: <ClipboardList className="h-4 w-4" />,
}

// Map progress to semantic color tokens
function progressAccent(progress: number): 'success' | 'info' | 'warning' | 'danger' {
  if (progress >= 80) return 'success'
  if (progress >= 60) return 'info'
  if (progress >= 40) return 'warning'
  return 'danger'
}

function progressColor(progress: number): string {
  const accent = progressAccent(progress)
  if (accent === 'success') return 'text-[var(--color-verdigris-500)]'
  if (accent === 'info') return 'text-[var(--color-info)]'
  if (accent === 'warning') return 'text-[var(--color-warning)]'
  return 'text-[var(--color-danger)]'
}

async function load() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return {
      teamKPIs: [],
      divisionSummaries: [],
      taskSummary: [],
      divisions: [],
      team: { members: [], divisions: [], stats: {} },
      error: 'config' as const,
    }
  }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [teamRes, divRes, taskRes, divisionsRes] = await Promise.all([
    supabase
      .from('team_personal_kpis')
      .select('user_id, name, position, division_id, division_name, kpi_count, avg_progress, achieved_count, on_track_count, at_risk_count, off_track_count')
      .neq('division_name', 'Test Seed')
      .order('avg_progress', { ascending: false }),
    supabase
      .from('division_kpi_summary')
      .select('*')
      .neq('division_name', 'Test Seed')
      .order('avg_progress', { ascending: false }),
    supabase
      .from('division_task_summary')
      .select('*')
      .neq('division_name', 'Test Seed')
      .order('division_name'),
    supabase
      .from('divisions')
      .select('id, name, code')
      .eq('is_active', true)
      .order('sort_order'),
  ])
  return {
    teamKPIs: teamRes.data ?? [],
    divisionSummaries: divRes.data ?? [],
    taskSummary: taskRes.data ?? [],
    divisions: divisionsRes.data ?? [],
    team: await loadTeamData(supabase),
    error: teamRes.error || divRes.error || taskRes.error ? 'fetch' : null,
  }
}

export default async function KepalaKantorDashboard() {
  const { teamKPIs, divisionSummaries, taskSummary, divisions, team, error } = await load()

  if (error === 'config') {
    return (
      <div className="space-y-6">
        <Breadcrumbs crumbs={[{ label: 'Kepala Kantor' }]} />
        <ErrorState
          title="Konfigurasi server belum lengkap"
          description="NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan."
          error="Missing env vars"
        />
      </div>
    )
  }

  const totalTasksCompleted = taskSummary?.reduce((sum, t) => sum + (Number(t.completed_count) || 0), 0) ?? 0
  const totalTasksOverdue = taskSummary?.reduce((sum, t) => sum + (Number(t.overdue_count) || 0), 0) ?? 0
  const avgProgress = teamKPIs?.length
    ? teamKPIs.reduce((sum, m) => sum + (Number(m.avg_progress) || 0), 0) / teamKPIs.length
    : 0
  const topPerformers = teamKPIs?.filter((m) => (Number(m.avg_progress) || 0) >= 80).length ?? 0

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: 'Kepala Kantor' }]} />

      {/* P3-1: Bug #12 fix - read-only banner for kepala_kantor */}
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 px-4 py-3 flex items-start gap-3"
      >
        <Shield className="h-5 w-5 mt-0.5 text-[var(--color-info)] shrink-0" aria-hidden />
        <div className="text-sm">
          <p className="font-medium text-[var(--color-text-primary)]">
            Mode Kepala Kantor — hanya baca
          </p>
          <p className="text-[var(--color-text-secondary)] mt-0.5">
            Anda dapat melihat seluruh data lintas divisi, namun tidak dapat mengubahnya. Perubahan didelegasikan ke PIC atau Staff di divisi masing-masing.
          </p>
        </div>
      </div>

      {/* Hero */}
      <HeroSection
        eyebrow={
          <>
            <Shield className="inline h-3 w-3 mr-1" aria-hidden /> Operasional
          </>
        }
        title={<h1 className="display-lg">Ringkasan operasional</h1>}
        subtitle="Performa lintas divisi dan ritme kerja tim. Update otomatis saat data berubah."
        pills={
          <span className="pill" data-variant="brand">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)]" aria-hidden />
            Live · realtime
          </span>
        }
      />

      {/* Stats */}
      <section
        aria-label="Statistik utama"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-item"
      >
        <StatCard
          label="Anggota tim aktif"
          value={teamKPIs?.length ?? 0}
          accent="brand"
          hint={teamKPIs ? `${topPerformers} di atas 80%` : undefined}
        />
        <StatCard
          label="Rata-rata progress"
          value={`${avgProgress.toFixed(0)}%`}
          accent={avgProgress >= 80 ? 'success' : avgProgress >= 60 ? 'info' : 'warning'}
        />
        <StatCard
          label="Task selesai"
          value={totalTasksCompleted.toLocaleString('id-ID')}
          accent="success"
        />
        <StatCard
          label="Lewat tempo"
          value={totalTasksOverdue.toLocaleString('id-ID')}
          accent={totalTasksOverdue > 0 ? 'danger' : 'neutral'}
        />
      </section>

      {/* Division cards */}
      <section>
        <PageHeader
          eyebrow="Divisi"
          title={<h2 className="display-md">Performa divisi</h2>}
          subtitle="Rata-rata progress KPI per divisi."
        />
        {divisionSummaries && divisionSummaries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {divisionSummaries.map((div: any) => {
              const progress = Number(div.avg_progress) || 0
              const accent = progressAccent(progress)
              return (
                <Link
                  key={div.division_id}
                  href={`/divisi/${div.division_id}`}
                  className="card hover:border-[var(--color-brand-500)]/40 transition-colors group"
                  aria-label={`${div.division_name} — ${progress.toFixed(0)}% progress`}
                >
                  <div className="card-body space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="cluster-badge">{div.division_code}</p>
                        <p className="font-heading text-base font-semibold mt-1 group-hover:text-[var(--color-brand-500)] transition-colors">
                          {div.division_name}
                        </p>
                      </div>
                      <div className="text-[var(--color-brand-500)] opacity-60">
                        {DIVISION_ICON[div.division_code] ?? <Target className="h-4 w-4" />}
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <p className={`text-3xl font-heading font-bold tabular-nums ${progressColor(progress)}`}>
                        {progress.toFixed(0)}%
                      </p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">{div.kpi_count} KPI</p>
                    </div>

                    <div
                      className="relative h-1 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]"
                      role="progressbar"
                      aria-label={`Progress ${div.division_name}`}
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`absolute inset-y-0 left-0 bg-[var(--color-${accent})]`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-1 text-[10px]">
                      <span className="pill" data-variant="success">{div.achieved_count} tercapai</span>
                      <span className="pill" data-variant="info">{div.on_track_count} on track</span>
                      {(div.at_risk_count ?? 0) > 0 && (
                        <span className="pill" data-variant="warning">{div.at_risk_count} at risk</span>
                      )}
                      {(div.off_track_count ?? 0) > 0 && (
                        <span className="pill" data-variant="danger">{div.off_track_count} off</span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            eyebrow="Divisi"
            title="Belum ada data performa divisi"
            description="Tambahkan divisi dan assign KPI untuk mulai melihat performa lintas divisi."
            action={{ label: 'Buka Admin > Divisi', href: '/admin/divisions' }}
          />
        )}
      </section>

      {/* Team KPIs */}
      <section>
        <PageHeader
          eyebrow="Tim"
          title={<h2 className="display-md">Performa tim</h2>}
          subtitle={`${teamKPIs?.length ?? 0} anggota dengan KPI personal aktif. Klik baris untuk lihat detail.`}
        />
        {teamKPIs && teamKPIs.length > 0 ? (
          <PersonalKpiTable members={teamKPIs as any} />
        ) : (
          <EmptyState
            icon={Target}
            eyebrow="Tim"
            title="Belum ada data KPI personal tim"
            description="Assign KPI ke anggota tim untuk mulai menampilkan progres mereka di sini."
            action={{ label: 'Buka Admin > Users', href: '/admin/users' }}
          />
        )}
      </section>

      {/* Task summary per divisi */}
      <section>
        <PageHeader
          eyebrow="Task"
          title={<h2 className="display-md">Status task per divisi</h2>}
          subtitle="Jumlah task berdasarkan status di tiap divisi."
        />
        {taskSummary && taskSummary.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {taskSummary.map((t: any) => (
              <Link
                key={t.division_id}
                href={`/divisi/${t.division_id}`}
                className="card hover:border-[var(--color-brand-500)]/40 transition-colors"
                aria-label={`${t.division_name} — ${Number(t.completion_rate).toFixed(0)}% selesai`}
              >
                <div className="card-body">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-heading text-base font-semibold">{t.division_name}</p>
                    <span
                      className="pill"
                      data-variant={
                        t.completion_rate >= 80 ? 'success' : t.completion_rate >= 60 ? 'info' : 'warning'
                      }
                    >
                      {Number(t.completion_rate).toFixed(0)}% selesai
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-2xl font-heading font-bold tabular-nums text-[var(--color-verdigris-500)]">
                        {t.completed_count}
                      </p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Selesai</p>
                    </div>
                    <div>
                      <p className="text-2xl font-heading font-bold tabular-nums text-[var(--color-info)]">
                        {t.in_progress_count}
                      </p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Berjalan</p>
                    </div>
                    <div>
                      <p className="text-2xl font-heading font-bold tabular-nums text-[var(--color-warning)]">
                        {t.pending_count}
                      </p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Tertunda</p>
                    </div>
                    <div>
                      <p
                        className={`text-2xl font-heading font-bold tabular-nums ${t.overdue_count > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-tertiary)]'}`}
                      >
                        {t.overdue_count}
                      </p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Lewat tempo</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            eyebrow="Task"
            title="Belum ada data task"
            description="Tambahkan task pertama untuk melihat distribusi status."
          />
        )}
      </section>

      {/* Quick links to divisions */}
      {divisions && divisions.length > 0 && (
        <section>
          <PageHeader
            eyebrow="Navigasi"
            title={<h2 className="display-md">Lompat ke divisi</h2>}
            subtitle="Halaman detail tiap divisi."
          />
          <div className="flex flex-wrap gap-2">
            {divisions.map((d: any) => (
              <Link
                key={d.id}
                href={`/divisi/${d.id}`}
                className="pill hover:scale-105 transition-transform"
                data-variant="brand"
              >
                {d.name} <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ==================== TEAM GRID (manager control) ==================== */}
      <section>
        <TeamGrid
          members={team.members}
          divisions={team.divisions}
          stats={team.stats}
        />
      </section>
    </div>
  )
}
