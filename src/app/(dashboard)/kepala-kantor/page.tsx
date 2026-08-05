// kepala-kantor/page.tsx
// Halaman Kepala Kantor — semua divisi + performa tim + ritme kerja.
// Samakan dengan /owner/overview tapi fokusnya operasional lintas divisi.

'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Target, Building2, ClipboardList, Shield, FileText, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatPercent } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { TopPageHero } from '@/components/layout/TopPageHero'
import { StatCard } from '@/components/layout/StatCard'
import { PersonalKpiTable } from '@/components/kpi/PersonalKpiTable'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { EmptyState } from '@/components/ui/empty-state'

const DIVISION_ICON: Record<string, React.ReactNode> = {
  MARKETING: <Target className="h-5 w-5" />,
  FINANCE: <ClipboardList className="h-5 w-5" />,
  CONSTRUCTION: <Building2 className="h-5 w-5" />,
  MAINTENANCE: <Shield className="h-5 w-5" />,
  MEDIA: <FileText className="h-5 w-5" />,
  PURCHASING: <ClipboardList className="h-5 w-5" />,
}

export default function KepalaKantorDashboard() {
  const supabase = createClient()

  // Fetch division summary
  const { data: divisionSummaries } = useQuery({
    queryKey: ['division-kpi-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('division_kpi_summary')
        .select('*').neq('division_name', 'Test Seed')
        .order('avg_progress', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  // Fetch team personal KPIs
  const { data: teamKPIs } = useQuery({
    queryKey: ['team-personal-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_personal_kpis')
        .select('user_id, name, position, division_id, division_name, kpi_count, avg_progress, achieved_count, on_track_count, at_risk_count, off_track_count')
        .neq('division_name', 'Test Seed')
        .order('avg_progress', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  // Fetch task summary
  const { data: taskSummary } = useQuery({
    queryKey: ['division-task-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('division_task_summary')
        .select('*').neq('division_name', 'Test Seed')
        .order('division_name')
      if (error) throw error
      return data ?? []
    },
  })

  // Fetch divisions for cross-link
  const { data: divisions } = useQuery({
    queryKey: ['divisions-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('id, name, code')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })

  const totalTasksCompleted = taskSummary?.reduce((sum, t) => sum + (t.completed_count ?? 0), 0) ?? 0
  const totalTasksOverdue = taskSummary?.reduce((sum, t) => sum + (t.overdue_count ?? 0), 0) ?? 0
  const avgProgress = teamKPIs?.length
    ? teamKPIs.reduce((sum, m) => sum + (Number(m.avg_progress) || 0), 0) / teamKPIs.length
    : 0

  return (
    <div className="space-y-8">
      
      <Breadcrumbs crumbs={[{ label: "Kepala Kantor" }]} />
      <TopPageHero
        title="Ringkasan Operasional"
        subtitle="Performa lintas divisi dan ritme kerja tim. Update otomatis saat data berubah."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Anggota tim aktif"
          value={teamKPIs?.length ?? 0}
          accent="brand"
          hint={teamKPIs ? `${teamKPIs.filter(m => (Number(m.avg_progress) || 0) >= 80).length} di atas 80%` : undefined}
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
      </div>

      {/* Division cards */}
      <section>
        <header className="mb-4">
          <h2 className="display-md">Performa Divisi</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Rata-rata progress KPI per divisi.</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {divisionSummaries?.map((div: any) => {
            const progress = Number(div.avg_progress) || 0
            const accent = progress >= 80 ? 'success' : progress >= 60 ? 'info' : progress >= 40 ? 'warning' : 'danger'
            return (
              <Link
                key={div.division_id}
                href={`/divisi/${div.division_id}`}
                className="card hover:border-[var(--color-brand-500)]/40 transition-colors group"
              >
                <div className="card-body space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">{div.division_code}</p>
                      <p className="font-heading text-base font-semibold mt-1 group-hover:text-[var(--color-brand-500)] transition-colors">{div.division_name}</p>
                    </div>
                    <div className="text-[var(--color-brand-500)] opacity-60">{DIVISION_ICON[div.division_code] ?? <Target className="h-5 w-5" />}</div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <p className={`text-3xl font-heading font-bold tabular-nums ${accent === 'success' ? 'text-emerald-500' : accent === 'info' ? 'text-sky-500' : accent === 'warning' ? 'text-amber-500' : 'text-rose-500'}`}>{progress.toFixed(0)}%</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{div.kpi_count} KPI</p>
                  </div>

                  <div className="relative h-1 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                    <div className="absolute inset-y-0 left-0 bg-[var(--color-brand-500)]" style={{ width: `${Math.min(100, progress)}%` }} />
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className="pill" data-variant="success">{div.achieved_count} tercapai</span>
                    <span className="pill" data-variant="info">{div.on_track_count} on track</span>
                    {(div.at_risk_count ?? 0) > 0 && <span className="pill" data-variant="warning">{div.at_risk_count} at risk</span>}
                    {(div.off_track_count ?? 0) > 0 && <span className="pill" data-variant="danger">{div.off_track_count} off</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Team KPIs */}
      <section>
        <header className="mb-4">
          <h2 className="display-md">Performa Tim</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{teamKPIs?.length ?? 0} anggota dengan KPI personal aktif. Klik baris untuk lihat detail.</p>
        </header>
        {teamKPIs && teamKPIs.length > 0 ? (
          <PersonalKpiTable members={teamKPIs as any} />
        ) : (
          <EmptyState
        icon={ Target }
        title="Belum ada data KPI personal tim."
        description=""
      />
        )}
      </section>

      {/* Task summary per divisi */}
      <section>
        <header className="mb-4">
          <h2 className="display-md">Status Task per Divisi</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Jumlah task berdasarkan status di tiap divisi.</p>
        </header>
        {taskSummary && taskSummary.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {taskSummary.map((t: any) => (
              <div key={t.division_id} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-heading text-base font-semibold">{t.division_name}</p>
                    <span className="pill" data-variant={t.completion_rate >= 80 ? 'success' : t.completion_rate >= 60 ? 'info' : 'warning'}>
                      {Number(t.completion_rate).toFixed(0)}% selesai
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-2xl font-heading font-bold tabular-nums text-emerald-500">{t.completed_count}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Selesai</p>
                    </div>
                    <div>
                      <p className="text-2xl font-heading font-bold tabular-nums text-sky-500">{t.in_progress_count}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Berjalan</p>
                    </div>
                    <div>
                      <p className="text-2xl font-heading font-bold tabular-nums text-amber-500">{t.pending_count}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Tertunda</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-heading font-bold tabular-nums ${t.overdue_count > 0 ? 'text-rose-500' : 'text-[var(--color-text-tertiary)]'}`}>{t.overdue_count}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Lewat tempo</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-8 text-center">
            <ClipboardList className="h-8 w-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-secondary)]">Belum ada data task.</p>
          </div>
        )}
      </section>

      {/* Quick links to divisions */}
      {divisions && divisions.length > 0 && (
        <section>
          <header className="mb-4">
            <h2 className="display-md">Lompat ke Divisi</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Halaman detail tiap divisi.</p>
          </header>
          <div className="flex flex-wrap gap-2">
            {divisions.map((d: any) => (
              <Link key={d.id} href={`/divisi/${d.id}`} className="pill" data-variant="brand">
                {d.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
