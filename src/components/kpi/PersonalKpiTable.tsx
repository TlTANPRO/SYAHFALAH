// components/kpi/PersonalKpiTable.tsx
// Tabel KPI personal tim. Tampil di halaman divisi & KK.

export interface PersonalKpiRow {
  user_id: string
  name: string
  position?: string | null
  kpi_count?: number
  avg_progress?: number | null
  achieved_count?: number | null
  on_track_count?: number | null
  at_risk_count?: number | null
  off_track_count?: number | null
}

export function PersonalKpiTable({ members }: { members: PersonalKpiRow[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto"><table className="data-table">
        <thead>
          <tr>
            <th>Nama</th>
            <th>Posisi</th>
            <th className="text-right">KPI</th>
            <th className="text-right">Progress</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const progress = Number(m.avg_progress ?? 0)
            return (
              <tr key={m.user_id}>
                <td className="font-medium">{m.name}</td>
                <td className="text-sm text-[var(--color-text-secondary)]">{m.position ?? '—'}</td>
                <td className="text-right tabular-nums font-mono">{m.kpi_count ?? 0}</td>
                <td className="text-right tabular-nums font-mono font-semibold">{progress.toFixed(1)}%</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <span className="pill" data-variant="success">{m.achieved_count ?? 0} tercapai</span>
                    <span className="pill" data-variant="info">{m.on_track_count ?? 0} on track</span>
                    {(m.at_risk_count ?? 0) > 0 && <span className="pill" data-variant="warning">{m.at_risk_count} at risk</span>}
                    {(m.off_track_count ?? 0) > 0 && <span className="pill" data-variant="danger">{m.off_track_count} off</span>}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table></div>
    </div>
  )
}
