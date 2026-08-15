// divisi/[divisionId]/page.tsx
// Halaman divisi untuk PIC / Kepala Kantor / Owner.
// Server-side fetch (via service_role) supaya query `divisions`, `kpis`, dan
// `team_personal_kpis` (view) return data despite RLS deny untuk anon role.
//
// VIEW COLUMN NOTES (refactored 2026-08-09):
// - kpis view: target_value (bukan target), actual_value (bukan actual)
// - sow_with_tasks view: id, title, description, tags, progress, status
//   (sebelumnya pakai position_name, tujuan_posisi, tools, task_count, kpi_ringkasan
//    yang tidak exist — schema sudah berubah)

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Target,
  TrendingUp,
  Users,
  ClipboardList,
  FileText,
  ArrowRight,
  Building2,
} from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { HeroSection } from '@/components/layout/HeroSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/layout/StatCard'
import { KpiTile } from '@/components/layout/KpiTile'
import { PersonalKpiTable } from '@/components/kpi/PersonalKpiTable'
import { TeamGrid, loadTeamData } from '@/components/manager/TeamGrid'
import { EmptyState } from '@/components/ui/empty-state'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

interface PageProps {
  params: Promise<{ divisionId: string }>
}

async function load(divisionId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return { division: null, divisionKPIs: [], teamKPIs: [], taskSummary: null, sows: [], error: 'config' as const }
  }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const year = new Date().getFullYear()
  const [divRes, kpiRes, teamRes, taskRes, sowRes] = await Promise.all([
    supabase.from('divisions').select('id, name, code, description, head_user_id').eq('id', divisionId).maybeSingle(),
    supabase
      .from('kpis')
      .select('id, code, name, target_value, actual_value, progress, status, unit, period_start')
      .eq('division_id', divisionId)
      .eq('level', 'division')
      .gte('period_start', `${year}-01-01`)
      .lte('period_start', `${year}-12-31`)
      .order('period_start', { ascending: false })
      .limit(12),
    supabase
      .from('team_personal_kpis')
      .select('user_id, name, position, kpi_count, avg_progress, achieved_count, on_track_count, at_risk_count, off_track_count')
      .eq('division_id', divisionId)
      .neq('division_name', 'Test Seed')
      .order('avg_progress', { ascending: false }),
    supabase
      .from('division_task_summary')
      .select('division_id, division_name, completion_rate, completed_count, pending_count, in_progress_count, overdue_count, carry_over_count')
      .eq('division_id', divisionId)
      .maybeSingle(),
    supabase
      .from('sow_with_tasks')
      .select('id, title, description, tags, progress, status')
      .eq('division_id', divisionId)
      .order('status'),
  ])
  return {
    division: divRes.data,
    divisionKPIs: kpiRes.data ?? [],
    teamKPIs: teamRes.data ?? [],
    taskSummary: taskRes.data,
    sows: sowRes.data ?? [],
    team: await loadTeamData(supabase, { divisionId }),
    error: null,
  }
}

function renderKpiValue(value: any, unit: string | null): string {
  if (value === null || value === undefined) return '—'
  if (unit === 'IDR') return formatCurrency(Number(value))
  if (unit === '%') return formatPercent(Number(value))
  return `${value}${unit ? ' ' + unit : ''}`
}

export default async function DivisionDashboard({ params }: PageProps) {
  const { divisionId } = await params
  const { division, divisionKPIs, teamKPIs, taskSummary, sows, team, error } = await load(divisionId)

  if (error === 'config') {
    return (
      <div className="space-y-6">
        <Breadcrumbs crumbs={[{ label: 'Divisi' }, { label: 'Overview' }]} />
        <EmptyState
          icon={Building2}
          eyebrow="Konfigurasi"
          title="Server belum dikonfigurasi"
          description="SUPABASE_SERVICE_ROLE_KEY tidak ditemukan. Hubungi admin."
        />
      </div>
    )
  }

  if (!division) {
    return (
      <div className="space-y-6">
        <Breadcrumbs crumbs={[{ label: 'Divisi' }, { label: 'Overview' }]} />
        <HeroSection
          eyebrow="Divisi"
          title="Divisi tidak ditemukan"
          subtitle={`ID ${divisionId} tidak ada di data aktif.`}
        />
        <Link href="/" className="btn" data-variant="primary" data-size="sm">
          ← Kembali ke dashboard
        </Link>
      </div>
    )
  }

  const completionRate = Number(taskSummary?.completion_rate ?? 0)

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: 'Divisi' }, { label: division.name }]} />

      {/* Hero header */}
      <HeroSection
        eyebrow={
          <>
            <Building2 className="inline h-3 w-3 mr-1" aria-hidden /> Divisi
          </>
        }
        title={<h1 className="display-lg">{division.name}</h1>}
        subtitle={division.description || 'Ringkasan divisi, target, dan tim.'}
        pills={
          <div className="flex items-center gap-2">
            <span className="cluster-badge">{division.code}</span>
            <Link
              href={`/divisi/${divisionId}/kpi`}
              className="btn"
              data-variant="primary"
              data-size="sm"
            >
              Lihat KPI <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <section
        aria-label="Statistik utama"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-item"
      >
        <StatCard
          label="Task selesai"
          value={`${completionRate.toFixed(0)}%`}
          accent="brand"
          hint={
            taskSummary
              ? `${taskSummary.completed_count} dari ${taskSummary.completed_count + taskSummary.pending_count + taskSummary.in_progress_count}`
              : '—'
          }
        />
        <StatCard
          label="Lewat tempo"
          value={taskSummary?.overdue_count ?? 0}
          accent={taskSummary && taskSummary.overdue_count > 0 ? 'danger' : 'neutral'}
        />
        <StatCard
          label="KPI divisi aktif"
          value={divisionKPIs.length}
          accent="info"
        />
        <StatCard
          label="Anggota tim"
          value={teamKPIs.length}
          accent="neutral"
        />
      </section>

      {/* Division KPIs */}
      <section>
        <PageHeader
          eyebrow="Target"
          title={<h2 className="display-md">Target KPI Divisi</h2>}
          subtitle={`Level 3 — apa yang harus dicapai divisi ${division.name} di tahun ini.`}
        />
        {divisionKPIs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {divisionKPIs.map((kpi: any) => (
              <KpiTile
                key={kpi.id}
                code={kpi.code}
                name={kpi.name}
                target={renderKpiValue(kpi.target_value, kpi.unit)}
                actual={renderKpiValue(kpi.actual_value, kpi.unit)}
                progress={Number(kpi.progress) || 0}
                status={kpi.status}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Target}
            eyebrow="KPI"
            title={`Belum ada target KPI untuk divisi ini di tahun ${new Date().getFullYear()}`}
            description="Tambahkan target KPI melalui menu Admin > KPI Definition, atau hubungi Kepala Kantor untuk setup awal."
            action={{ label: 'Buka KPI Library', href: '/kpi' }}
          />
        )}
      </section>

      {/* Team personal KPIs */}
      <section>
        <PageHeader
          eyebrow="Tim"
          title={<h2 className="display-md">Performa Tim</h2>}
          subtitle={`${teamKPIs.length} anggota dengan KPI personal aktif.`}
          actions={
            <Link
              href={`/divisi/${divisionId}/team`}
              className="btn"
              data-variant="outline"
              data-size="sm"
            >
              Lihat tim <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        />
        {teamKPIs.length > 0 ? (
          <PersonalKpiTable members={teamKPIs as any} />
        ) : (
          <EmptyState
            icon={Users}
            eyebrow="Tim"
            title="Belum ada anggota dengan KPI personal di divisi ini"
            description="Tambahkan anggota tim terlebih dahulu untuk mulai melacak KPI personal mereka."
            action={{ label: 'Buka Admin > Users', href: '/admin/users' }}
          />
        )}
      </section>

      {/* Task completion breakdown */}
      <section>
        <PageHeader
          eyebrow="Task"
          title={<h2 className="display-md">Status Task</h2>}
          subtitle="Jumlah task berdasarkan statusnya."
        />
        {taskSummary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Selesai" value={taskSummary.completed_count} accent="success" />
            <StatCard label="Berjalan" value={taskSummary.in_progress_count} accent="info" />
            <StatCard label="Tertunda" value={taskSummary.pending_count} accent="warning" />
            <StatCard
              label="Lewat tempo"
              value={taskSummary.overdue_count}
              accent={taskSummary.overdue_count > 0 ? 'danger' : 'neutral'}
            />
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            eyebrow="Task"
            title="Belum ada task untuk divisi ini"
            description="Tambahkan task pertama untuk mulai melihat bagaimana status task berubah dari waktu ke waktu."
          />
        )}
      </section>

      {/* SOW */}
      <section>
        <PageHeader
          eyebrow="SOW"
          title={<h2 className="display-md">Scope of Work</h2>}
          subtitle={`SOW aktif di divisi ${division.name}.`}
        />
        {sows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sows.map((sow: any) => (
              <div key={sow.id} className="card">
                <div className="card-body space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-heading text-base font-semibold">{sow.title}</p>
                    <span
                      className="pill"
                      data-variant={
                        sow.status === 'in_progress'
                          ? 'info'
                          : sow.status === 'planned'
                          ? 'neutral'
                          : 'success'
                      }
                    >
                      {sow.status}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
                    {sow.description}
                  </p>
                  {sow.tags && sow.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sow.tags.slice(0, 4).map((tag: string) => (
                        <span key={tag} className="pill" data-variant="neutral">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="pt-2 border-t border-[var(--color-border-default)] flex items-center justify-between">
                    <p className="text-xs text-[var(--color-text-tertiary)] font-mono">
                      Progress {Number(sow.progress ?? 0).toFixed(0)}%
                    </p>
                    <Link
                      href={`/divisi/${divisionId}/kpi`}
                      className="text-xs text-[var(--color-brand-500)] hover:underline font-medium"
                    >
                      Detail KPI →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            eyebrow="SOW"
            title="Belum ada SOW aktif untuk divisi ini"
            description="Buat SOW untuk setiap posisi di divisi. SOW membantu anggota tim memahami tanggung jawab dan target mereka."
            action={{ label: 'Buka SOW Editor', href: '/admin/sow' }}
          />
        )}
      </section>

      {/* ==================== TEAM GRID (PIC divisi scope) ==================== */}
      <section>
        <TeamGrid
          members={team.members}
          divisions={team.divisions}
          stats={team.stats}
          scope="division"
        />
      </section>
    </div>
  )
}
