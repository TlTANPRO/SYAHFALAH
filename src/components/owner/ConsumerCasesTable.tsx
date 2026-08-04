// components/owner/ConsumerCasesTable.tsx
// SP3K → BAST → SHM tracker for consumer cases.
// Organized by stage with deadline visibility.

import { FileSignature, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface ConsumerCase {
  id: string
  code: string
  consumer_name: string
  unit_code: string
  cluster_id: string
  stage: string
  sp3k_deadline: string | null
  bast_date: string | null
  amount_rupiah: number
  is_overdue: boolean
}

const STAGE_LABEL: Record<string, { label: string; variant: string }> = {
  berkas:    { label: 'Berkas',  variant: 'neutral' },
  sp3k:      { label: 'SP3K',    variant: 'warning' },
  akad:      { label: 'Akad',    variant: 'info' },
  bast:      { label: 'BAST',    variant: 'success' },
  shm:       { label: 'SHM',     variant: 'success' },
  completed: { label: 'Selesai', variant: 'success' },
}

function formatRupiah(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}jt`
  return String(n)
}

export function ConsumerCasesTable({ cases, clusters }: {
  cases: ConsumerCase[]
  clusters: Array<{ id: string; code: string }>
}) {
  if (cases.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-8 text-center">
        <FileSignature className="h-8 w-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Belum ada kasus konsumen. Apply migration 011 untuk mengaktifkan.
        </p>
      </div>
    )
  }

  const clusterById = new Map(clusters.map((c) => [c.id, c.code]))

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Konsumen</th>
            <th>Unit</th>
            <th>Cluster</th>
            <th>Stage</th>
            <th>SP3K Deadline</th>
            <th className="text-right">Nilai</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => {
            const stage = STAGE_LABEL[c.stage] || { label: c.stage, variant: 'neutral' }
            return (
              <tr key={c.id}>
                <td>
                  <p className="font-medium text-sm">{c.consumer_name}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] font-mono">{c.code}</p>
                </td>
                <td className="font-mono text-xs">{c.unit_code}</td>
                <td>
                  <span className="cluster-badge">{clusterById.get(c.cluster_id) || '—'}</span>
                </td>
                <td>
                  <span className="pill" data-variant={stage.variant}>{stage.label}</span>
                </td>
                <td>
                  {c.sp3k_deadline ? (
                    <p className="font-mono text-xs text-[var(--color-text-secondary)]">{c.sp3k_deadline}</p>
                  ) : (
                    <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
                  )}
                </td>
                <td className="text-right font-mono text-xs">Rp {formatRupiah(c.amount_rupiah)}</td>
                <td>
                  {c.is_overdue ? (
                    <span className="pill" data-variant="danger">
                      <AlertTriangle className="h-3 w-3" />
                      Overdue
                    </span>
                  ) : c.stage === 'completed' ? (
                    <span className="pill" data-variant="success">
                      <CheckCircle2 className="h-3 w-3" />
                      Done
                    </span>
                  ) : (
                    <span className="pill" data-variant="neutral">On track</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
