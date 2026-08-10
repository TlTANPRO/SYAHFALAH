// src/components/ui/conflict-resolution-dialog.tsx
// Modal shown when conflict is detected during save.
// Shows side-by-side comparison + resolution actions.

'use client'

import * as React from 'react'
import { X, ArrowRight, RotateCcw, Save } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

export interface ConflictField {
  name: string
  /** My value */
  mine: unknown
  /** Their value (from server) */
  theirs: unknown
  /** Original baseline value */
  base: unknown
}

interface Props {
  open: boolean
  onClose: () => void
  rowLabel?: string
  conflictingFields: ConflictField[]
  onResolve: (resolution: 'accept-theirs' | 'keep-mine' | 'merge', merged?: Record<string, unknown>) => void
}

export function ConflictResolutionDialog({
  open,
  onClose,
  rowLabel,
  conflictingFields,
  onResolve,
}: Props) {
  // Per-field selection: 'mine' | 'theirs' | 'custom'
  const [choices, setChoices] = React.useState<Record<string, 'mine' | 'theirs'>>({})
  
  React.useEffect(() => {
    if (open) {
      // Default: prefer mine for each conflicting field
      const initial: Record<string, 'mine' | 'theirs'> = {}
      conflictingFields.forEach((f) => {
        initial[f.name] = 'mine'
      })
      setChoices(initial)
    }
  }, [open, conflictingFields])
  
  if (!open) return null
  
  const formatValue = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '—'
    if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak'
    if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(v).toLocaleDateString('id-ID')
    }
    const s = String(v)
    return s.length > 80 ? s.slice(0, 80) + '...' : s
  }
  
  const handleMerge = () => {
    const merged: Record<string, unknown> = {}
    for (const f of conflictingFields) {
      merged[f.name] = choices[f.name] === 'mine' ? f.mine : f.theirs
    }
    onResolve('merge', merged)
  }
  
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
    >
      <div className="bg-[var(--color-surface-1)] rounded-xl border border-[var(--color-warning)]/40 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-default)]">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[var(--color-warning)]/15 flex items-center justify-center text-[var(--color-warning)]">
              ⚠️
            </div>
            <div>
              <h2 id="conflict-dialog-title" className="text-lg font-semibold">
                Konflik data
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {rowLabel ?? 'Baris'} diubah orang lain sejak Anda mulai edit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)]"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Pilih versi yang ingin disimpan untuk setiap field:
          </p>
          
          {conflictingFields.map((field) => {
            const choice = choices[field.name] ?? 'mine'
            return (
              <div
                key={field.name}
                className="rounded-lg border border-[var(--color-border-default)] overflow-hidden"
              >
                <div className="px-3 py-2 bg-[var(--color-surface-2)] border-b border-[var(--color-border-default)] flex items-center justify-between">
                  <span className="font-mono text-xs font-medium">{field.name}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">sebelumnya: {formatValue(field.base)}</span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-[var(--color-border-default)]">
                  <button
                    type="button"
                    onClick={() => setChoices((prev) => ({ ...prev, [field.name]: 'mine' }))}
                    className={cn(
                      'p-3 text-left transition-colors',
                      choice === 'mine' 
                        ? 'bg-[var(--color-brand-500)]/10 ring-2 ring-inset ring-[var(--color-brand-500)]' 
                        : 'hover:bg-[var(--color-surface-2)]'
                    )}
                    aria-pressed={choice === 'mine'}
                  >
                    <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-brand-500)] mb-1">
                      Versi saya
                    </div>
                    <div className="text-sm">{formatValue(field.mine)}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChoices((prev) => ({ ...prev, [field.name]: 'theirs' }))}
                    className={cn(
                      'p-3 text-left transition-colors',
                      choice === 'theirs' 
                        ? 'bg-[var(--color-warning)]/10 ring-2 ring-inset ring-[var(--color-warning)]' 
                        : 'hover:bg-[var(--color-surface-2)]'
                    )}
                    aria-pressed={choice === 'theirs'}
                  >
                    <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-warning)] mb-1">
                      Versi server
                    </div>
                    <div className="text-sm">{formatValue(field.theirs)}</div>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-4 border-t border-[var(--color-border-default)] bg-[var(--color-surface-2)]">
          <Button variant="ghost" onClick={() => onResolve('accept-theirs')}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Batalkan & Terima Server
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Tutup
            </Button>
            <Button onClick={handleMerge}>
              <Save className="h-4 w-4 mr-1.5" />
              Simpan Pilihan
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
