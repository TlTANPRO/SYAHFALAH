// src/components/ui/BulkActionBar.tsx
// Sticky bottom action bar that appears when rows are selected in a table.
// Shows count + actions (export selected, delete, change status, etc).

'use client'

import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface BulkActionBarProps {
  /** Number of selected rows. Accepts either prop name for compatibility. */
  selectedCount?: number
  count?: number
  /** Total rows (for "X of Y" display). */
  total?: number
  onClear: () => void
  children: ReactNode
}

export function BulkActionBar({ selectedCount, count, total, onClear, children }: BulkActionBarProps) {
  const n = selectedCount ?? count ?? 0
  if (n === 0) return null

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-[var(--color-brand-700)] text-white px-4 py-2.5 shadow-2xl motion-page-fade-in"
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/20 text-xs font-bold">
          {n}
        </span>
        {total != null ? `${n} dari ${total}` : "dipilih"}
      </span>
      <div className="h-5 w-px bg-white/30" aria-hidden />
      <div className="flex items-center gap-1">{children}</div>
      <button
        type="button"
        onClick={onClear}
        className="ml-1 p-1 rounded-full hover:bg-white/20 transition"
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
