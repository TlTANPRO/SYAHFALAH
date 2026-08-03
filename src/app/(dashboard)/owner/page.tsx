// app/owner/page.tsx
// Owner Executive Dashboard

'use client'

import { SectionLabel } from '@/components/layout/BentoGrid'
import { KPICard, BentoGrid, ChartCard, TableCard } from '@/components/layout/BentoGrid'
import { Target, TrendingUp, DollarSign, Users, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

export default function OwnerDashboard() {
  const supabase = createClient()

  // Fetch company KPIs
  const { data: companyKPIs } = useQuery({
    queryKey: ['kpis', { level: 'company' }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('level', 'company')
        .gte('period_start', `${new Date().getFullYear()}-01-01`)
        .lte('period_end', `${new Date().getFullYear()}-12-31`)
      if (error) throw error
      return data
    },
  })

  // Fetch division summaries
  const { data: divisionSummaries } = useQuery({
    queryKey: ['division-summaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('division_kpi_summary')
        .select('*')
      if (error) throw error
      return data
    },
  })

  // Fetch team personal KPIs
  const { data: teamKPIs } = useQuery({
    queryKey: ['team-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_personal_kpis')
        .select('*')
      if (error) throw error
      return data
    },
  })

  // Fetch task summary
  const { data: taskSummary } = useQuery({
    queryKey: ['division-task-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('division_task_summary')
        .select('*')
      if (error) throw error
      return data
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <SectionLabel number={0} title="Executive Dashboard" subtitle="Real-time overview of company performance" />
      </div>

      {/* Company KPI Scorecards */}
      <SectionLabel number={1} title="Company KPIs (Level 1)" subtitle="Strategic targets for PT Syahfalah Global" />
      <BentoGrid columns={4}>
        {companyKPIs?.map((kpi) => (
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
              kpi.code === 'COM-REV-01' ? <DollarSign className="h-5 w-5" /> :
              kpi.code === 'COM-PM-01' ? <TrendingUp className="h-5 w-5" /> :
              kpi.code === 'COM-UNIT-01' ? <CheckCircle className="h-5 w-5" /> :
              <Target className="h-5 w-5" />
            }
            accent={kpi.code === 'COM-REV-01'}
          />
        ))}
      </BentoGrid>

      {/* Division KPI Summary */}
      <SectionLabel number={2} title="Division Performance (Level 3)" subtitle="KPI achievement by division" />
      <BentoGrid columns={3}>
        {divisionSummaries?.map((div) => (
          <ChartCard
            key={div.division_id}
            title={div.division_name}
            subtitle={`${div.kpi_count} KPIs • ${div.avg_progress}% avg`}
            span={{ colStart: 1, colEnd: 2 }}
          >
            <div className="h-full flex flex-col justify-center items-center gap-2">
              <div className="text-center">
                <p className="font-heading text-4xl font-bold text-foreground">{div.avg_progress}%</p>
                <p className="text-sm text-muted-foreground">Average Progress</p>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1 text-success">
                  <CheckCircle className="h-3 w-3" /> {div.achieved_count} Achieved
                </span>
                <span className="flex items-center gap-1 text-info">
                  <TrendingUp className="h-3 w-3" /> {div.on_track_count} On Track
                </span>
                <span className="flex items-center gap-1 text-warning">
                  <AlertTriangle className="h-3 w-3" /> {div.at_risk_count} At Risk
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" /> {div.off_track_count} Off Track
                </span>
              </div>
            </div>
          </ChartCard>
        ))}
      </BentoGrid>

      {/* Team KPI Summary */}
      <SectionLabel number={3} title="Team Personal KPIs (Level 4)" subtitle="Individual performance overview" />
      <TableCard
        title="Personal KPI Status"
        subtitle={`${teamKPIs?.length || 0} active team members`}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-medium text-muted-foreground">Team Member</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Division</th>
              <th className="text-left p-3 font-medium text-muted-foreground">KPIs</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Avg Progress</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {teamKPIs?.map((member) => (
              <tr key={member.user_id} className="border-b border-border/50 hover:bg-muted/50">
                <td className="p-3">
                  <div className="font-medium">{member.name}</div>
                  <div className="text-sm text-muted-foreground">{member.position}</div>
                </td>
                <td className="p-3 text-sm text-muted-foreground">{member.division_name}</td>
                <td className="p-3 text-sm">{member.kpi_count} KPIs</td>
                <td className="p-3 font-medium tabular-nums">{member.avg_progress}%</td>
                <td className="p-3">
                  <div className="flex gap-2">
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

      {/* Task Completion by Division */}
      <SectionLabel number={4} title="Today's Task Completion" subtitle="Real-time task progress across divisions" />
      <BentoGrid columns={2}>
        {taskSummary?.map((div) => (
          <ChartCard
            key={div.division_id}
            title={div.division_name}
            subtitle={`${div.completion_rate}% completion rate`}
          >
            <div className="h-full flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="font-heading text-3xl font-bold text-foreground">{div.completed_count}</p>
                  <p className="text-sm text-success">Completed</p>
                </div>
                <div>
                  <p className="font-heading text-3xl font-bold text-foreground">{div.pending_count}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
                <div>
                  <p className="font-heading text-3xl font-bold text-foreground">{div.in_progress_count}</p>
                  <p className="text-sm text-info">In Progress</p>
                </div>
                <div>
                  <p className="font-heading text-3xl font-bold text-foreground">{div.overdue_count}</p>
                  <p className="text-sm text-destructive">Overdue</p>
                </div>
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {div.carry_over_count} carry-over tasks
              </div>
            </div>
          </ChartCard>
        ))}
      </BentoGrid>
    </div>
  )
}