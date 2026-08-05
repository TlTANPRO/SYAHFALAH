// components/ui/ExportCsvButton.tsx
// Generic CSV export trigger. Pass rows + columns; click downloads file
// with UTF-8 BOM (Excel-friendly) + date-suffixed filename.

'use client'

import { Download } from 'lucide-react'
import { toCsv, downloadCsv } from '@/lib/csv'

interface Props {
  rows: Record<string, unknown>[]
  columns?: string[]
  /** Override default filename (default: 'export-YYYY-MM-DD.csv'). */
  filename?: string
  /** Filename prefix used with date suffix. Default 'export'. */
  prefix?: string
  /** Override button label. Default 'Export CSV'. */
  label?: string
  /** Disable button (e.g. when rows is empty). */
  disabled?: boolean
}

function defaultFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`
}

export function ExportCsvButton({ rows, columns, filename, prefix, label, disabled }: Props) {
  function handleExport() {
    const csv = toCsv(rows, columns)
    if (!csv) return
    downloadCsv(filename ?? defaultFilename(prefix ?? 'export'), csv)
  }
  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || rows.length === 0}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--color-border-default)] hover:border-[var(--color-brand-500)] hover:text-[var(--color-brand-500)] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--color-border-default)] disabled:hover:text-inherit"
    >
      <Download className="h-4 w-4" />
      {label ?? 'Export CSV'}
    </button>
  )
}
