// components/ui/SavedViewsBar.tsx
// Compact bar untuk save/load/delete saved views. localStorage-backed
// (see useSavedViews). Renders inline above a filter row.

'use client'

import { Bookmark, ChevronDown, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { SavedView } from '@/lib/hooks/useSavedViews'

interface Props {
  scope: string
  views: SavedView[]
  current: Record<string, unknown>
  hydrated: boolean
  onSave: (label: string) => string
  onApply: (state: Record<string, unknown>) => void
  onRemove: (id: string) => void
}

export function SavedViewsBar({ views, current, hydrated, onSave, onApply, onRemove }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [label, setLabel] = useState('')

  if (!hydrated) return null

  const handleSave = () => {
    onSave(label)
    setLabel('')
    setSaving(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
        <Bookmark className="h-3 w-3" /> Views
      </span>
      {views.length === 0 && (
        <span className="text-xs text-[var(--color-text-tertiary)]">Belum ada view tersimpan</span>
      )}
      {views.map(v => (
        <div
          key={v.id}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] pl-3 pr-1 py-0.5 text-xs"
        >
          <button
            type="button"
            onClick={() => onApply(v.state)}
            className="hover:text-[var(--color-brand-500)] transition-colors"
            aria-label={`Apply view ${v.label}`}
          >
            {v.label}
          </button>
          <button
            type="button"
            onClick={() => onRemove(v.id)}
            className="p-0.5 rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger)]/15 hover:text-[var(--color-danger)] transition-colors"
            aria-label={`Hapus view ${v.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {saving ? (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] pl-3 pr-1 py-0.5">
          <input
            type="text"
            autoFocus
            placeholder="Nama view"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') setSaving(false)
            }}
            className="bg-transparent text-xs w-24 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSave}
            className="px-2 py-0.5 rounded-full bg-[var(--color-brand-500)] text-white text-xs font-medium hover:opacity-90"
          >
            Save
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSaving(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--color-border-default)] px-2.5 py-0.5 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-brand-500)] hover:text-[var(--color-brand-500)] transition-colors"
        >
          + Save current
        </button>
      )}
    </div>
  )
}