// app/(dashboard)/kpi/KpiTable.tsx
// Client component for the KPI Explorer table. Adds checkbox column +
// bulk action bar (export selected). State via useSelection + toast on
// action.

'use client'

import { Download } from 'lucide-react'
import { useMemo } from 'react'
import { SelectableTable } from '@/components/ui/SelectableTable'
import { BulkActionBar } from '@/components/ui/BulkActionBar'
import { useSelection } from '@/lib/hooks/useSelection'
import { useUIStore } from '@/stores/uiStore'

interface KpiRow {
  code: string
  name: string | null
  level: string
  division_id: string | null
  unit: string | null
  latestTarget: number | null
  latestActual: number | null
  avgProgress: number | null
  latestStatus: string | null
  periods: number
}

interface Props {
  rows: KpiRow[]
  divisions: { id: string; name: string }[]
}

const STATUS_VARIANT: Record<string, string> = {
  achieved: 'success', on_track: 'info', at_risk: 'warning', off_track: 'danger',
}
const STATUS_LABEL: Record<string, string> = {
  achieved: 'Tercapai', on_track: 'On track', at_risk: 'At risk', off_track: 'Off track',
}

function formatValue(v: number | null, unit: string | null): string {
  if (v == null) return '—'
  if (unit === '%') return `${v.toFixed(1)}%`
  if (unit === 'IDR') return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
  if (unit === 'count') return `${v.toFixed(0)}`
  return unit ? `${v.toFixed(1)} ${unit}` : v.toFixed(1)
}

function exportRows(rows: KpiRow[], divisions: { id: string; name: string }[]) {
  const divName = new Map(divisions.map(d => [d.id, d.name]))
  const header = ['Kode', 'Nama', 'Level', 'Divisi', 'Target', 'Actual', 'Progress (%)', 'Status', 'Periode']
  const csv = [header.join(',')]
  for (const r of rows) {
    csv.push([
      r.code,
      JSON.stringify(r.name ?? ''),
      r.level,
      JSON.stringify(divName.get(r.division_id ?? '') ?? ''),
      formatValue(r.latestTarget, r.unit),
      formatValue(r.latestActual, r.unit),
      r.avgProgress != null ? r.avgProgress.toFixed(0) : '',
      STATUS_LABEL[r.latestStatus ?? ''] ?? '',
      String(r.periods),
    ].join(','))
  }
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kpi-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function KpiTable({ rows, divisions }: Props) {
  const selection = useSelection(rows, r => r.code)
  const addToast = useUIStore(s => s.addToast)

  const divName = useMemo(
    () => new Map(divisions.map(d => [d.id, d.name])),
    [divisions]
  )

  const handleExportSelected = () => {
    if (selection.selectedRows.length === 0) return
    exportRows(selection.selectedRows, divisions)
    addToast({
      type: 'success',
      title: `${selection.selectedRows.length} KPI diexpor`,
      message: 'File CSV sudah didownload',
    })
  }

  return (
    <>
      <BulkActionBar
        count={selection.count}
        total={rows.length}
        onClear={selection.clear}
      >
        <button
          type="button"
          onClick={handleExportSelected}
          className="inline-flex items-center gap-1 rounded-md bg-[var(--color-brand-500)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-inverse)] hover:opacity-90 transition-opacity"
        >
          <Download className="h-3 w-3" /> Export CSV
        </button>
      </BulkActionBar>

      <SelectableTable
        rows={rows}
        getId={(r) => r.code}
        selected={selection.selected}
        onToggle={selection.toggle}
        onToggleAll={selection.toggleAll}
        isAllSelected={selection.isAllSelected}
        emptyState={
          <p className="text-sm text-[var(--color-text-secondary)]">Tidak ada KPI yang cocok dengan filter.</p>
        }
        headerCells={[
          { key: 'kpi', label: 'KPI' },
          { key: 'div', label: 'Divisi' },
          { key: 'prog', label: 'Progress rata-rata', align: 'right' },
          { key: 'tgt', label: 'Target', align: 'right' },
          { key: 'act', label: 'Actual (terbaru)', align: 'right' },
          { key: 'status', label: 'Status' },
          { key: 'period', label: 'Periode' },
        ]}
      >
        {(k) => (
          <>
            <td>
              <p className="font-medium">{k.name || '—'}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mt-0.5">{k.code}</p>
            </td>
            <td className="text-sm text-[var(--color-text-secondary)]">
              {k.division_id ? divName.get(k.division_id) ?? '—' : '—'}
            </td>
            <td className="text-right tabular-nums font-mono font-semibold">
              {k.avgProgress != null ? `${k.avgProgress.toFixed(0)}%` : '—'}
            </td>
            <td className="text-right tabular-nums font-mono text-sm">
              {formatValue(k.latestTarget, k.unit)}
            </td>
            <td className="text-right tabular-nums font-mono text-sm">
              {formatValue(k.latestActual, k.unit)}
            </td>
            <td>
              {k.latestStatus && (
                <span className="pill" data-variant={STATUS_VARIANT[k.latestStatus] ?? 'neutral'}>
                  {STATUS_LABEL[k.latestStatus] ?? k.latestStatus}
                </span>
              )}
            </td>
            <td className="text-xs text-[var(--color-text-tertiary)] font-mono">{k.periods}x</td>
          </>
        )}
      </SelectableTable>
    </>
  )
}