// app/(dashboard)/divisi/[divisionId]/page.tsx
// Division Dashboard for PIC Divisi

'use client'

import { useParams } from 'next/navigation'
import { SectionLabel } from '@/components/layout/BentoGrid'
import { KPICard, BentoGrid, ChartCard, TableCard } from '@/components/layout/BentoGrid'
import { Target, TrendingUp, DollarSign, Users, CheckCircle, AlertTriangle, Building2, ClipboardList, Shield, FileText, Calendar, Home } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

const divisionInfo: Record<string, { name: string; code: string; icon: React.ReactNode; color: string; bg: string }> = {
  '44444444-4444-4444-4444-444444444444': { name: 'Marketing & Sales', code: 'MKT', icon: <Users className="h-6 w-6" />, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  '55555555-5555-5555-5555-555555555555': { name: 'Proyek & Konstruksi', code: 'PRJ', icon: <Building2 className="h-6 w-6" />, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
  '66666666-6666-6666-6666-666666666666': { name: 'Operasional & Admin', code: 'OPS', icon: <ClipboardList className="h-6 w-6" />, color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
  '33333333-3333-3333-3333-333333333333': { name: 'Legal / Compliance', code: 'LGL', icon: <Shield className="h-6 w-6" />, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
  '77777777-7777-7777-7777-777777777777': { name: 'Media & Konten Kreatif', code: 'MED', icon: <FileText className="h-6 w-6" />, color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20' },
  '22222222-2222-2222-2222-222222222222': { name: 'Owner / Director', code: 'OWN', icon: <Home className="h-6 w-6" />, color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20' },
}

export default function DivisionDashboard() {
  const params = useParams()
  const divisionId = params.divisionId as string
  const info = divisionInfo[divisionId] || { name: 'Division', code: 'DIV', icon: <Target className="h-6 w-6" />, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' }
  const supabase = createClient()

  // Fetch division KPIs
  const { data: divisionKPIs } = useQuery({
    queryKey: ['kpis', { division: divisionId, level: 'division' }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('division_id', divisionId)
        .eq('level', 'division')
        .gte('period_start', `${new Date().getFullYear()}-01-01`)
        .lte('period_end', `${new Date().getFullYear()}-12-31`)
      if (error) throw error
      return data
    },
    enabled: !!divisionId,
  })

  // Fetch team personal KPIs
  const { data: teamKPIs } = useQuery({
    queryKey: ['team-kpis', divisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_personal_kpis')
        .select('*')
        .eq('division_id', divisionId)
      if (error) throw error
      return data
    },
    enabled: !!divisionId,
  })

  // Fetch division tasks
  const { data: taskSummary } = useQuery({
    queryKey: ['division-task-summary', divisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('division_task_summary')
        .select('*')
        .eq('division_id', divisionId)
      if (error) throw error
      return data
    },
    enabled: !!divisionId,
  })

  // Fetch SOW for this division
  const { data: sows } = useQuery({
    queryKey: ['sows', divisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sow_with_tasks')
        .select('*')
        .eq('division_id', divisionId)
      if (error) throw error
      return data
    },
    enabled: !!divisionId,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SectionLabel number={0} title={info.name} subtitle={`Division Dashboard • ${info.code}`} />
        </div>
        <span className={`px-3 py-1 ${info.bg} ${info.color} text-sm rounded-full font-medium`}>{info.code}</span>
      </div>

      {/* Division KPIs */}
      <SectionLabel number={1} title="Division KPIs (Level 3)" subtitle="Strategic targets for this division" />
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
              kpi.code?.includes('REV') ? <DollarSign className="h-5 w-5" /> :
              kpi.code?.includes('MARGIN') ? <TrendingUp className="h-5 w-5" /> :
              kpi.code?.includes('UNIT') ? <CheckCircle className="h-5 w-5" /> :
              <Target className="h-5 w-5" />
            }
          />
        ))}
      </BentoGrid>

      {/* Team KPIs */}
      <SectionLabel number={2} title="Team Personal KPIs (Level 4)" subtitle="Individual team member performance" />
      <TableCard
        title="Team KPI Status"
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

      {/* Task Summary */}
      <SectionLabel number={3} title="Today's Task Completion" subtitle="Division task progress" />
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

      {/* SOW Overview */}
      <SectionLabel number={4} title="Scope of Work" subtitle="Active SOWs in this division" />
      <BentoGrid columns={3}>
        {sows?.map((sow) => (
          <ChartCard key={sow.id} title={sow.position_name} className={info.bg}>
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
              <Link href={`/divisi/${divisionId}/kpi`} className="text-primary hover:underline text-sm font-medium">
                View Division KPIs →
              </Link>
            </div>
          </ChartCard>
        ))}
      </BentoGrid>
    </div>
  )
}