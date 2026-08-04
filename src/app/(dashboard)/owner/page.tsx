// app/owner/page.tsx
// Owner Executive Dashboard. After the refactor it composes three
// pieces instead of repeating inline query + JSX:
//   - useKpiCascade() for the four rollup queries
//   - <DivisionCard> for the per-division summary
//   - <PersonalKpiTable> for the team KPI table
//   - <KpiTrendChart> for the YTD trend

'use client'

import { SectionLabel, KPICard, BentoGrid, ChartCard } from '@/components/layout/BentoGrid'
import { Target, TrendingUp, DollarSign, CheckCircle } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { useKpiCascade, type KpiRow } from '@/hooks/useKpiCascade'
import { DivisionCard, PersonalKpiTable } from '@/components/kpi'
import { KpiTrendChart } from '@/components/kpi/KpiTrendChart'

const KPI_ICONS: Record<string, React.ReactNode> = {
  'COM-REV-01': <DollarSign className="h-5 w-5" />,
  'COM-PM-01':  <TrendingUp className="h-5 w-5" />,
  'COM-UNIT-01': <CheckCircle className="h-5 w-5" />,
}

function formatKpiValue(v: number | null, unit: string | null | undefined): string {
  if (v == null) return '—'
  if (unit === 'IDR') return formatCurrency(v)
  if (unit === '%')   return formatPercent(v)
  return String(v)
}

export default function OwnerDashboard() {
  const { companyKpis, divisionSummaries, teamPersonalKpis, divisionTaskSummary, isLoading } =
    useKpiCascade('company')

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionLabel
        number={0}
        title="Executive Dashboard"
        subtitle="Real-time overview of company performance"
      />

      {/* Company KPI Scorecards */}
      <SectionLabel number={1} title="Company KPIs (Level 1)" subtitle="Strategic targets for PT Syahfalah Global" />
      <BentoGrid columns={4}>
        {companyKpis.data?.map((kpi) => (
          <KPICard
            key={kpi.id}
            label={kpi.name ?? kpi.code ?? 'KPI'}
            value={formatKpiValue(kpi.actual, kpi.unit)}
            target={formatKpiValue(kpi.target, kpi.unit)}
            progress={kpi.progress ?? 0}
            status={kpi.status ?? 'off_track'}
            icon={KPI_ICONS[kpi.code ?? ''] ?? <Target className="h-5 w-5" />}
            accent={kpi.code === 'COM-REV-01'}
          />
        ))}
      </BentoGrid>

      {/* Division KPI Summary */}
      <SectionLabel number={2} title="Division Performance (Level 3)" subtitle="KPI achievement by division" />
      <BentoGrid columns={3}>
        {divisionSummaries.data?.map((div) => (
          <DivisionCard key={div.division_id} division={div} />
        ))}
      </BentoGrid>

      {/* KPI Trend (YTD) */}
      <KpiTrendChart level="company" title="KPI Trend (YTD)" />

      {/* Team KPI Summary */}
      <SectionLabel number={3} title="Team Personal KPIs (Level 4)" subtitle="Individual performance overview" />
      <PersonalKpiTable members={teamPersonalKpis.data ?? []} />

      {/* Task Completion by Division */}
      <SectionLabel number={4} title="Today's Task Completion" subtitle="Real-time task progress across divisions" />
      <BentoGrid columns={2}>
        {divisionTaskSummary.data?.map((div) => (
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
              {div.carry_over_count > 0 && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {div.carry_over_count} carry-over tasks
                </div>
              )}
            </div>
          </ChartCard>
        ))}
      </BentoGrid>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-2">Memuat data…</p>
      )}
    </div>
  )
}
