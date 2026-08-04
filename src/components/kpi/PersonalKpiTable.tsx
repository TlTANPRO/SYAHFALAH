// components/kpi/PersonalKpiTable.tsx
// Table of team members' personal KPI rollups. Used by the executive
// dashboard and the kepala-kantor management view. Was previously
// inlined in owner/page.tsx and kepala-kantor/page.tsx.

import { TableCard } from '@/components/layout/BentoGrid'
import { formatPercent } from '@/lib/utils'

export type PersonalKpiRow = {
  user_id: string
  full_name: string
  division_name: string | null
  kpi_count: number
  avg_progress: number | null
  achieved?: number
  on_track?: number
  at_risk?: number
  off_track?: number
}

interface PersonalKpiTableProps {
  members: PersonalKpiRow[]
  title?: string
  subtitle?: string
}

export function PersonalKpiTable({
  members,
  title = 'Personal KPI Status',
  subtitle,
}: PersonalKpiTableProps) {
  const total = subtitle ?? `${members.length} active team members`
  return (
    <TableCard title={title} subtitle={total}>
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
          {members.map((m) => (
            <tr key={m.user_id} className="border-b border-border/50">
              <td className="p-3 font-medium">{m.full_name}</td>
              <td className="p-3 text-muted-foreground">{m.division_name ?? '—'}</td>
              <td className="p-3 tabular-nums">{m.kpi_count} KPIs</td>
              <td className="p-3 font-medium tabular-nums">{formatPercent(m.avg_progress)}</td>
              <td className="p-3 text-xs">
                <span className="text-success">{m.achieved ?? 0} ✓</span>{' '}
                <span className="text-info">{m.on_track ?? 0} ↗</span>{' '}
                <span className="text-warning">{m.at_risk ?? 0} ⚠</span>{' '}
                <span className="text-destructive">{m.off_track ?? 0} ✗</span>
              </td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-muted-foreground">
                Tidak ada data personal KPI
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </TableCard>
  )
}
