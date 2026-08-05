// components/kpi/DivisionCard.tsx
// Single division's KPI summary card. Renders the division name,
// aggregate progress, and the achieved/on-track/at-risk/off-track
// counts. Used by the executive dashboard (owner, kepala-kantor).
//
// Pulled out of owner/page.tsx and kepala-kantor/page.tsx where the
// same JSX was duplicated 8 times across both files.

import { CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react'
import { ChartCard } from '@/components/layout/BentoGrid'
import { formatPercent } from '@/lib/utils'

export type DivisionKpiSummary = {
  division_id: string
  division_name: string
  kpi_count: number
  avg_progress: number | null
  achieved_count?: number
  on_track_count?: number
  at_risk_count?: number
  off_track_count?: number
}

interface DivisionCardProps {
  division: DivisionKpiSummary
  /** Optional column span override for BentoGrid placement. */
  span?: { colStart: number; colEnd: number }
  /** Render as a simpler card without ChartCard wrapper. */
  bare?: boolean
}

export function DivisionCard({ division, span, bare = false }: DivisionCardProps) {
  const body = (
    <div className="h-full flex flex-col justify-center items-center gap-3 py-2">
      <div className="text-center">
        <p className="font-heading text-4xl font-bold text-[var(--color-text-primary)]">
          {formatPercent(division.avg_progress)}
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">Average Progress</p>
      </div>
      <div className="flex flex-wrap gap-3 text-xs justify-center">
        <span className="flex items-center gap-1 text-[var(--color-success)]">
          <CheckCircle className="h-3 w-3" /> {division.achieved_count ?? 0} Achieved
        </span>
        <span className="flex items-center gap-1 text-[var(--color-info)]">
          <TrendingUp className="h-3 w-3" /> {division.on_track_count ?? 0} On Track
        </span>
        <span className="flex items-center gap-1 text-[var(--color-warning)]">
          <AlertTriangle className="h-3 w-3" /> {division.at_risk_count ?? 0} At Risk
        </span>
        <span className="flex items-center gap-1 text-[var(--color-danger)]">
          <AlertTriangle className="h-3 w-3" /> {division.off_track_count ?? 0} Off Track
        </span>
      </div>
    </div>
  )

  if (bare) return body

  return (
    <ChartCard
      title={division.division_name}
      subtitle={`${division.kpi_count} KPIs • ${formatPercent(division.avg_progress)} avg`}
      span={span}
    >
      {body}
    </ChartCard>
  )
}
