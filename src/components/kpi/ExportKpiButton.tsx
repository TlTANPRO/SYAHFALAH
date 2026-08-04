// components/kpi/ExportKpiButton.tsx
// Tombol untuk export KPI ke CSV.

'use client'

import { Download } from 'lucide-react'
import { toCsv, downloadCsv } from '@/lib/csv'

interface AggregatedKpi {
  code: string
  name: string
  level: string
  unit: string | null
  division_id: string | null
  periods: number
  avgProgress: number | null
  latestTarget: number | null
  latestActual: number | null
  latestProgress: number | null
  latestStatus: string | null
}

interface Division {
  id: string
  name: string
}

const LEVEL_LABEL: Record<string, string> = {
  company: 'Perusahaan',
  division: 'Divisi',
  personal: 'Personal',
}

export function ExportKpiButton({ rows, divisions }: { rows: AggregatedKpi[]; divisions: Division[] }) {
  const divName = new Map(divisions.map(d => [d.id, d.name]))

  function handleExport() {
    const data = rows.map(r => ({
      kode: r.code,
      nama: r.name,
      level: LEVEL_LABEL[r.level] || r.level,
      divisi: r.division_id ? divName.get(r.division_id) ?? '' : '',
      unit: r.unit ?? '',
      periode: r.periods,
      progress_rata_rata: r.avgProgress != null ? `${r.avgProgress.toFixed(1)}%` : '',
      target: r.latestTarget ?? '',
      actual_terbaru: r.latestActual ?? '',
      progress_terbaru: r.latestProgress != null ? `${r.latestProgress.toFixed(0)}%` : '',
      status_terbaru: r.latestStatus ?? '',
    }))
    const csv = toCsv(data)
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(`kpi-${date}.csv`, csv)
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--color-border-default)] hover:border-[var(--color-brand-500)] hover:text-[var(--color-brand-500)] text-sm font-medium transition-colors"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  )
}
