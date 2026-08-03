// app/(dashboard)/kepala-kantor/divisi/media/page.tsx
// Media & Konten Kreatif Division Detail Dashboard

'use client'

import { SectionLabel } from '@/components/layout/BentoGrid'
import { KPICard, BentoGrid, ChartCard, TableCard } from '@/components/layout/BentoGrid'
import { FileText, Target, TrendingUp, CheckCircle, AlertTriangle, Calendar, Video, Image, Music, Hash, DollarSign } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

export default function MediaDivisionDashboard() {
  const supabase = createClient()

  const { data: divisionKPIs } = useQuery({
    queryKey: ['kpis', { division: 'MED', level: 'division' }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('division_id', '77777777-7777-7777-7777-777777777777')
        .eq('level', 'division')
        .eq('period_start', '2026-01-01')
        .eq('period_end', '2026-12-31')
      if (error) throw error
      return data
    },
  })

  const { data: teamKPIs } = useQuery({
    queryKey: ['team-kpis', 'media'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_personal_kpis')
        .select('*')
        .eq('division_id', '77777777-7777-7777-7777-777777777777')
      if (error) throw error
      return data
    },
  })

  const { data: taskSummary } = useQuery({
    queryKey: ['division-task-summary', 'media'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('division_task_summary')
        .select('*')
        .eq('division_id', '77777777-7777-7777-7777-777777777777')
      if (error) throw error
      return data
    },
  })

  const { data: sows } = useQuery({
    queryKey: ['sows', 'media'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sow_with_tasks')
        .select('*')
        .eq('division_id', '77777777-7777-7777-7777-777777777777')
      if (error) throw error
      return data
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <SectionLabel number={0} title="Media & Konten Kreatif Division" subtitle="Content creation, social media & branding" />
        </div>
        <span className="px-3 py-1 bg-pink-500/10 text-pink-500 text-sm rounded-full font-medium">MED</span>
      </div>

      <SectionLabel number={1} title="Division KPIs (Level 3)" subtitle="Media-specific strategic targets" />
      <BentoGrid columns={4}>
        {divisionKPIs?.map((kpi) => (
          <KPICard
            key={kpi.id}
            label={kpi.name}
            value={kpi.unit === 'IDR' ? formatCurrency(Number(kpi.actual)) : 
                   kpi.unit === '%' ? formatPercent(Number(kpi.actual)) :
                   String(kpi.actual)}
            target={kpi.unit === 'IDR' ? formatCurrency(Number(kpi.target)) : 
                   kpi.unit === '%' ? formatPercent(Number(kpi.target)) :
                   String(kpi.target)}
            progress={Number(kpi.progress)}
            status={kpi.status as any}
            icon={
              kpi.code?.includes('CONTENT') ? <FileText className="h-5 w-5" /> :
              kpi.code?.includes('ENGAGE') ? <Hash className="h-5 w-5" /> :
              kpi.code?.includes('LEAD') ? <TrendingUp className="h-5 w-5" /> :
              kpi.code?.includes('VIRAL') ? <Video className="h-5 w-5" /> :
              kpi.code?.includes('MONET') ? <DollarSign className="h-5 w-5" /> :
              <FileText className="h-5 w-5" />
            }
          />
        ))}
      </BentoGrid>

      <SectionLabel number={2} title="Team Personal KPIs (Level 4)" subtitle="Individual media team performance" />
      <TableCard
        title="Media Team KPI Status"
        subtitle={`${teamKPIs?.length || 0} team members`}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-medium text-muted-foreground">Team Member</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Position</th>
              <th className="text-left p-3 font-medium text-muted-foreground">KPIs</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Avg Progress</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {teamKPIs?.map((member) => (
              <tr key={member.user_id} className="border-b border-border/50 hover:bg-muted/50">
                <td className="p-3 font-medium">{member.name}</td>
                <td className="p-3 text-sm text-muted-foreground">{member.position}</td>
                <td className="p-3 text-sm">{member.kpi_count} KPIs</td>
                <td className="p-3 font-medium tabular-nums">{member.avg_progress}%</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="badge-status badge-achieved">{member.achieved_count} ✓</span>
                    <span className="badge-status badge-on_track">{member.on_track_count} ↗</span>
                    <span className="badge-status badge-at_risk">{member.at_risk_count} ⚠</span>
                    <span className="badge-status badge-off_track">{member.off_track_count} ✗</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      <SectionLabel number={3} title="Today's Task Completion" subtitle="Media division task progress" />
      <BentoGrid columns={2}>
        {taskSummary?.map((div) => (
          <ChartCard
            key={div.division_id}
            title={div.division_name}
            subtitle={`${div.completion_rate}% completion rate`}
          >
            <div className="h-full flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div><p className="font-heading text-3xl font-bold text-foreground">{div.completed_count}</p><p className="text-sm text-success">Completed</p></div>
                <div><p className="font-heading text-3xl font-bold text-foreground">{div.pending_count}</p><p className="text-sm text-muted-foreground">Pending</p></div>
                <div><p className="font-heading text-3xl font-bold text-foreground">{div.in_progress_count}</p><p className="text-sm text-info">In Progress</p></div>
                <div><p className="font-heading text-3xl font-bold text-foreground">{div.overdue_count}</p><p className="text-sm text-destructive">Overdue</p></div>
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">{div.carry_over_count} carry-over tasks</div>
            </div>
          </ChartCard>
        ))}
      </BentoGrid>

      <SectionLabel number={4} title="Scope of Work" subtitle="Active SOWs in Media division" />
      <BentoGrid columns={3}>
        {sows?.map((sow) => (
          <ChartCard key={sow.id} title={sow.position_name}>
            <div className="h-full space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">{sow.tujuan_posisi}</p>
              <div className="flex gap-2 flex-wrap">
                {sow.tools?.slice(0, 4).map((tool: string) => (
                  <span key={tool} className="px-2 py-1 bg-muted text-xs rounded border">{tool}</span>
                ))}
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">{sow.task_count} tasks</p>
                <p className="text-xs font-medium text-primary">{sow.kpi_ringkasan}</p>
              </div>
            </div>
          </ChartCard>
        ))}
      </BentoGrid>
    </div>
  )
}