// components/ui/BulkActionBar.tsx
// Selection bar yang muncul di atas table ketika user pilih 1+ rows.
// Generic, reusable — pass selection count + onClear + action buttons.

'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  count: number
  total: number
  onClear: () => void
  children?: ReactNode
}

export function BulkActionBar({ count, total, onClear, children }: Props) {
  if (count === 0) return null
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="sticky top-16 z-20 mb-3 flex items-center gap-2 rounded-lg border border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/5 px-3 py-2 backdrop-blur-sm"
    >
      <span className="text-xs font-medium">
        {count} dari {total} dipilih
      </span>
      <div className="flex items-center gap-1 ml-2">{children}</div>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto p-1 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}