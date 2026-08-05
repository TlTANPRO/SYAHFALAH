// divisi/[divisionId]/page.tsx
// Halaman divisi untuk PIC / Kepala Kantor / Owner. Query division_name
// dari Supabase berdasarkan divisionId di URL.

'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Target, TrendingUp, DollarSign, Users, CheckCircle, AlertTriangle, Building2, ClipboardList, Shield, FileText, Calendar, Home } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { TopPageHero } from '@/components/layout/TopPageHero'
import { StatCard } from '@/components/layout/StatCard'
import { KpiTile } from '@/components/layout/KpiTile'
import { PersonalKpiTable } from '@/components/kpi/PersonalKpiTable'

export default function DivisionDashboard() {
  const params = useParams()
  const divisionId = params.divisionId as string
  const supabase = createClient()

  // 1. Fetch division meta by ID
  const { data: division, isLoading: divLoading } = useQuery({
    queryKey: ['division', divisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('id, name, code, description, head_user_id')
        .eq('id', divisionId)
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!divisionId,
  })

  // 2. Fetch division KPIs (current year)
  const { data: divisionKPIs } = useQuery({
    queryKey: ['kpis', { division: divisionId, level: 'division' }],
    queryFn: async () => {
      const year = new Date().getFullYear()
      const { data, error } = await supabase
        .from('kpis')
        .select('id, code, name, target, actual, progress, status, unit, period_start')
        .eq('division_id', divisionId)
        .eq('level', 'division')
        .gte('period_start', `${year}-01-01`)
        .lte('period_start', `${year}-12-31`)
        .order('period_start', { ascending: false })
        .limit(12)
      if (error) throw error
      return data ?? []
    },
    enabled: !!divisionId,
  })

  // 3. Fetch team personal KPIs (current)
  const { data: teamKPIs } = useQuery({
    queryKey: ['team-kpis', divisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_personal_kpis')
        .select('user_id, name, position, kpi_count, avg_progress, achieved_count, on_track_count, at_risk_count, off_track_count')
        .eq('division_id', divisionId)
        .neq('division_name', 'Test Seed')
        .order('avg_progress', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!divisionId,
  })

  // 4. Fetch task summary (this division only)
  const { data: taskSummary } = useQuery({
    queryKey: ['division-task-summary', divisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('division_task_summary')
        .select('division_id, division_name, completion_rate, completed_count, pending_count, in_progress_count, overdue_count, carry_over_count')
        .eq('division_id', divisionId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!divisionId,
  })

  // 5. Fetch SOW
  const { data: sows } = useQuery({
    queryKey: ['sows', divisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sow_with_tasks')
        .select('id, position_name, tujuan_posisi, tools, task_count, kpi_ringkasan, status')
        .eq('division_id', divisionId)
        .order('status')
      if (error) throw error
      return data ?? []
    },
    enabled: !!divisionId,
  })

  if (divLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-lg bg-[var(--color-surface-2)] animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!division) {
    return (
      <div className="space-y-6">
        <TopPageHero
          title="Divisi tidak ditemukan"
          subtitle={`ID ${divisionId} tidak ada di data aktif.`}
        />
        <Link href="/" className="text-sm text-[var(--color-brand-500)] hover:underline">← Kembali ke dashboard</Link>
      </div>
    )
  }

  const completionRate = taskSummary?.completion_rate ?? 0

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <TopPageHero
        title={division.name}
        subtitle={division.description || 'Ringkasan divisi, target, dan tim.'}
        rightSlot={
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">
            {division.code}
          </span>
        }
      />

      {/* Stats: task progress + team size + KPI count */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Task selesai"
          value={`${completionRate.toFixed(0)}%`}
          accent="brand"
          hint={taskSummary ? `${taskSummary.completed_count} dari ${taskSummary.completed_count + taskSummary.pending_count + taskSummary.in_progress_count}` : '—'}
        />
        <StatCard
          label="Lewat tempo"
          value={taskSummary?.overdue_count ?? 0}
          accent={taskSummary && taskSummary.overdue_count > 0 ? 'danger' : 'neutral'}
        />
        <StatCard
          label="KPI divisi aktif"
          value={divisionKPIs?.length ?? 0}
          accent="info"
        />
        <StatCard
          label="Anggota tim"
          value={teamKPIs?.length ?? 0}
          accent="neutral"
        />
      </div>

      {/* Division KPIs (Level 3) */}
      <section>
        <header className="mb-4">
          <h2 className="display-md">Target KPI Divisi</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Level 3 — apa yang harus dicapai divisi {division.name} di tahun ini.</p>
        </header>
        {divisionKPIs && divisionKPIs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {divisionKPIs.map((kpi: any) => (
              <KpiTile
                key={kpi.id}
                code={kpi.code}
                name={kpi.name}
                target={kpi.unit === 'IDR' ? formatCurrency(Number(kpi.target)) :
                       kpi.unit === '%' ? formatPercent(Number(kpi.target)) :
                       `${kpi.target}${kpi.unit ? ' ' + kpi.unit : ''}`}
                actual={kpi.unit === 'IDR' ? formatCurrency(Number(kpi.actual)) :
                        kpi.unit === '%' ? formatPercent(Number(kpi.actual)) :
                        `${kpi.actual}${kpi.unit ? ' ' + kpi.unit : ''}`}
                progress={Number(kpi.progress)}
                status={kpi.status}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-8 text-center">
            <Target className="h-8 w-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-secondary)]">Belum ada target KPI untuk divisi ini di tahun {new Date().getFullYear()}.</p>
          </div>
        )}
      </section>

      {/* Team personal KPIs (Level 4) */}
      <section>
        <header className="mb-4">
          <h2 className="display-md">Performa Tim</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{teamKPIs?.length ?? 0} anggota dengan KPI personal aktif.</p>
        </header>
        {teamKPIs && teamKPIs.length > 0 ? (
          <PersonalKpiTable members={teamKPIs as any} />
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-8 text-center">
            <Users className="h-8 w-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-secondary)]">Belum ada anggota dengan KPI personal di divisi ini.</p>
          </div>
        )}
      </section>

      {/* Task completion breakdown */}
      <section>
        <header className="mb-4">
          <h2 className="display-md">Status Task</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Jumlah task berdasarkan statusnya.</p>
        </header>
        {taskSummary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Selesai" value={taskSummary.completed_count} accent="success" />
            <StatCard label="Berjalan" value={taskSummary.in_progress_count} accent="info" />
            <StatCard label="Tertunda" value={taskSummary.pending_count} accent="warning" />
            <StatCard label="Lewat tempo" value={taskSummary.overdue_count} accent={taskSummary.overdue_count > 0 ? 'danger' : 'neutral'} />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-8 text-center">
            <ClipboardList className="h-8 w-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-secondary)]">Belum ada task untuk divisi ini.</p>
          </div>
        )}
      </section>

      {/* SOW */}
      <section>
        <header className="mb-4">
          <h2 className="display-md">Scope of Work</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">SOW aktif di divisi {division.name}.</p>
        </header>
        {sows && sows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sows.map((sow: any) => (
              <div key={sow.id} className="card">
                <div className="card-body space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-heading text-base font-semibold">{sow.position_name}</p>
                    <span className="pill" data-variant={sow.status === 'in_progress' ? 'info' : sow.status === 'planned' ? 'neutral' : 'success'}>{sow.status}</span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{sow.tujuan_posisi}</p>
                  {sow.tools && sow.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sow.tools.slice(0, 4).map((tool: string) => (
                        <span key={tool} className="pill" data-variant="neutral">{tool}</span>
                      ))}
                    </div>
                  )}
                  <div className="pt-2 border-t border-[var(--color-border-default)] flex items-center justify-between">
                    <p className="text-xs text-[var(--color-text-tertiary)] font-mono">{sow.task_count} tasks</p>
                    <Link href={`/divisi/${divisionId}/kpi`} className="text-xs text-[var(--color-brand-500)] hover:underline font-medium">
                      Detail KPI →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-8 text-center">
            <FileText className="h-8 w-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-secondary)]">Belum ada SOW aktif untuk divisi ini.</p>
          </div>
        )}
      </section>
    </div>
  )
}
