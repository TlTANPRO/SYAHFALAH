// src/components/ui/bulk-edit-dialog.tsx
// Multi-field bulk edit dialog. Apply multiple field changes to selected rows.

'use client'

import * as React from 'react'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from './button'
import { useUIStore } from '@/stores/uiStore'

interface FieldChange {
  id: string
  field: string
  value: string
}

interface Props {
  open: boolean
  onClose: () => void
  entity: string
  ids: string[]
  /** Available field names (from schema or page config) */
  availableFields?: Array<{ name: string; label: string; options?: Array<{ value: string; label: string }> }>
  /** Success callback */
  onComplete?: (updatedCount: number) => void
}

export function BulkEditDialog({
  open,
  onClose,
  entity,
  ids,
  availableFields = [],
  onComplete,
}: Props) {
  const [changes, setChanges] = React.useState<FieldChange[]>([])
  const [busy, setBusy] = React.useState(false)
  const addToast = useUIStore((s) => s.addToast)

  // Reset when opening
  React.useEffect(() => {
    if (open) {
      setChanges([])
    }
  }, [open])

  if (!open) return null

  const addChange = () => {
    setChanges((prev) => [
      ...prev,
      {
        id: `change-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        field: '',
        value: '',
      },
    ])
  }

  const removeChange = (id: string) => {
    setChanges((prev) => prev.filter((c) => c.id !== id))
  }

  const updateChange = (id: string, patch: Partial<FieldChange>) => {
    setChanges((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const apply = async () => {
    const fields: Record<string, string> = {}
    for (const c of changes) {
      if (c.field && c.value !== '') {
        fields[c.field] = c.value
      }
    }
    if (Object.keys(fields).length === 0) {
      addToast({ title: 'Tambahkan minimal 1 perubahan', type: 'destructive' })
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/bulk-update/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids, fields }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      
      const updated = body.data?.updated ?? ids.length
      addToast({
        title: `Berhasil`,
        message: `${updated} baris diperbarui (${Object.keys(fields).length} field)`,
        type: 'success',
      })
      onComplete?.(updated)
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal'
      addToast({ title: 'Gagal bulk update', message: msg, type: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-edit-dialog-title"
    >
      <div
        className="bg-[var(--color-surface-1)] rounded-xl border border-[var(--color-border-default)] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-default)]">
          <div>
            <h2 id="bulk-edit-dialog-title" className="text-lg font-semibold">
              Edit {ids.length} baris
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Tambahkan satu atau beberapa field yang akan diubah.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-8 w-8 inline-flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)]"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {changes.length === 0 && (
            <div className="text-center py-8 text-sm text-[var(--color-text-tertiary)]">
              Belum ada perubahan. Klik "Tambah Field" untuk mulai.
            </div>
          )}
          {changes.map((change, i) => {
            const fieldDef = availableFields.find((f) => f.name === change.field)
            return (
              <div
                key={change.id}
                className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-default)]"
              >
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      Field #{i + 1}
                    </label>
                    {availableFields.length > 0 ? (
                      <select
                        value={change.field}
                        onChange={(e) => updateChange(change.id, { field: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-1)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                      >
                        <option value="">Pilih field...</option>
                        {availableFields.map((f) => (
                          <option key={f.name} value={f.name}>{f.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={change.field}
                        onChange={(e) => updateChange(change.id, { field: e.target.value })}
                        placeholder="field name"
                        className="w-full mt-1 px-3 py-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-1)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      Nilai baru
                    </label>
                    {fieldDef?.options && fieldDef.options.length > 0 ? (
                      <select
                        value={change.value}
                        onChange={(e) => updateChange(change.id, { value: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-1)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                      >
                        <option value="">Pilih nilai...</option>
                        {fieldDef.options.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={change.value}
                        onChange={(e) => updateChange(change.id, { value: e.target.value })}
                        placeholder="nilai baru"
                        className="w-full mt-1 px-3 py-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-1)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                      />
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeChange(change.id)}
                  disabled={busy}
                  className="self-start h-8 w-8 inline-flex items-center justify-center rounded text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                  aria-label="Hapus field"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-[var(--color-border-default)] bg-[var(--color-surface-2)]">
          <Button
            type="button"
            variant="ghost"
            onClick={addChange}
            disabled={busy}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Field
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button onClick={apply} disabled={busy || changes.length === 0}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Terapkan
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
