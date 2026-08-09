// components/ui/detail-sheet.tsx
// Right-side drawer with tabs + FieldForm. Used to view/edit a single row.
// Inspired by Notion sidebar, Linear full-page modal, Salesforce detail panel.

'use client'

import * as React from 'react'
import { Loader2, Trash2, Save, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription, SheetClose } from './sheet'
import { Button } from './button'
import { FieldForm } from './field-form'
import { getSchema } from '@/lib/schema/registry'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

interface DetailSheetProps {
  /** Table name — looks up schema */
  table: string
  /** Row ID being edited */
  rowId: string | null
  /** Initial data — pass null to create new */
  data: Record<string, unknown> | null
  /** Open state */
  open: boolean
  /** Called when open state changes */
  onOpenChange: (open: boolean) => void
  /** Called when form is saved (after success). Receives the saved row. */
  onSaved: (row: Record<string, unknown>) => void
  /** Called when row is deleted */
  onDeleted?: () => void
  /** Delete handler — provide to enable delete button */
  onDelete?: () => Promise<void>
  /** Sheet width size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Mode: create or edit */
  mode?: 'create' | 'edit'
  /** Optional title override */
  title?: string
  /** Optional subtitle */
  subtitle?: string
  /** Disable edit (read-only view) */
  readOnly?: boolean
}

export function DetailSheet({
  table,
  rowId,
  data,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
  onDelete,
  size = 'lg',
  mode = 'edit',
  title,
  subtitle,
  readOnly = false,
}: DetailSheetProps) {
  const schema = getSchema(table)
  const [activeTab, setActiveTab] = React.useState<string>(
    schema?.tabs?.[0]?.id ?? '__all__'
  )
  const [saving, setSaving] = React.useState(false)
  const addToast = useUIStore((s) => s.addToast)

  React.useEffect(() => {
    if (open && schema?.tabs?.[0]?.id) {
      setActiveTab(schema.tabs[0].id)
    }
  }, [open, schema])

  if (!schema) {
    return null
  }

  const activeFields =
    schema.tabs && schema.tabs.length > 0
      ? (schema.tabs.find((t) => t.id === activeTab)?.fields ?? []).map(
          (name) => schema.fields.find((f) => f.name === name)!
        )
      : schema.fields

  const displayTitle: string = title
    ?? (mode === 'create'
      ? `Tambah ${schema.label}`
      : String(data?.title || data?.name || data?.full_name || `${schema.label} #${rowId?.slice(0, 8) ?? ''}`))

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (readOnly) return
    setSaving(true)
    try {
      const url = mode === 'create'
        ? schema.apiBase
        : `${schema.apiBase}/${rowId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const result = await res.json()
      const saved = result.data ?? result
      onSaved(saved)
      addToast({
        title: mode === 'create' ? 'Berhasil dibuat' : 'Tersimpan',
        message: `${schema.label} berhasil ${mode === 'create' ? 'dibuat' : 'diperbarui'}.`,
        type: 'success',
      })
      onOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan'
      addToast({
        title: 'Gagal',
        message: msg,
        type: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || !rowId) return
    if (!confirm(`Hapus ${schema.label} ini? Tindakan ini tidak dapat dibatalkan.`)) return
    setSaving(true)
    try {
      await onDelete()
      onDeleted?.()
      addToast({
        title: 'Berhasil dihapus',
        message: `${schema.label} telah dihapus.`,
        type: 'success',
      })
      onOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menghapus'
      addToast({
        title: 'Gagal',
        message: msg,
        type: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size={size} className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="pr-8">{displayTitle}</SheetTitle>
          {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
        </SheetHeader>

        {/* Tabs (if defined) */}
        {schema.tabs && schema.tabs.length > 1 && (
          <div className="px-6 border-b border-[var(--color-border-default)]">
            <div role="tablist" className="flex gap-1 overflow-x-auto -mb-px">
              {schema.tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-[var(--color-brand-500)] text-[var(--color-brand-500)]'
                      : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <SheetBody className="flex-1">
          {readOnly ? (
            <ReadOnlyView table={table} data={data ?? {}} activeFields={activeFields} />
          ) : (
            <FieldForm
              table={table}
              values={data ?? {}}
              onSubmit={handleSubmit}
              loading={saving}
              submitLabel={mode === 'create' ? 'Buat' : 'Simpan'}
              mode={mode}
              fieldFilter={(f) => activeFields.some((af) => af.name === f.name)}
            />
          )}
        </SheetBody>

        {!readOnly && (
          <SheetFooter className="flex items-center justify-between">
            <div>
              {onDelete && mode === 'edit' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={saving}
                  className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                >
                  <Trash2 className="h-3 w-3 mr-1.5" /> Hapus
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <SheetClose asChild>
                <Button type="button" variant="ghost" disabled={saving}>
                  Batal
                </Button>
              </SheetClose>
              <Button type="submit" form="detail-sheet-form" disabled={saving}>
                {saving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                <Save className="h-3 w-3 mr-1.5" />
                {mode === 'create' ? 'Buat' : 'Simpan'}
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Read-only view ─────────────────────────────────────────────────────────

function ReadOnlyView({
  table,
  data,
  activeFields,
}: {
  table: string
  data: Record<string, unknown>
  activeFields: any[]
}) {
  return (
    <dl className="grid grid-cols-12 gap-4">
      {activeFields.map((field) => {
        const colSpan = field.width === 12 ? 'col-span-12' : field.width === 6 ? 'col-span-12 md:col-span-6' : field.width === 4 ? 'col-span-12 md:col-span-4' : 'col-span-12 md:col-span-3'
        const value = data[field.name]
        return (
          <div key={field.name} className={colSpan}>
            <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1">
              {field.label}
            </dt>
            <dd className="text-sm text-[var(--color-text-primary)]">
              {value === null || value === undefined || value === '' ? (
                <span className="text-[var(--color-text-tertiary)] italic">—</span>
              ) : field.kind === 'date' || field.kind === 'datetime' ? (
                new Date(value as string).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              ) : field.kind === 'currency' ? (
                new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value))
              ) : field.kind === 'boolean' ? (
                value ? 'Ya' : 'Tidak'
              ) : (
                String(value)
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
