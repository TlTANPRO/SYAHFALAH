// components/ui/quick-add-dialog.tsx
// Quick-add modal accessible from Cmd+K. Shows the QUICK_ADD_ACTIONS
// registry. Pick an action → minimal form appears → submit → toast + close.

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Loader2, Plus } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { QUICK_ADD_ACTIONS, submitQuickAdd, type QuickAddAction } from '@/lib/quick-add'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

interface QuickAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickAddDialog({ open, onOpenChange }: QuickAddDialogProps) {
  const [query, setQuery] = React.useState('')
  const [selectedAction, setSelectedAction] = React.useState<QuickAddAction | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [formValues, setFormValues] = React.useState<Record<string, string>>({})
  const inputRef = React.useRef<HTMLInputElement>(null)
  const addToast = useUIStore((s) => s.addToast)
  const router = useRouter()

  React.useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedAction(null)
      setFormValues({})
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard shortcut: first letter of action triggers select
  React.useEffect(() => {
    if (!open || selectedAction) return
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const match = QUICK_ADD_ACTIONS.find((a) => a.shortcut === key)
      if (match && query === '') {
        e.preventDefault()
        setSelectedAction(match)
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true } as EventListenerOptions)
  }, [open, query, selectedAction])

  const filtered = QUICK_ADD_ACTIONS.filter(
    (a) =>
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.id.toLowerCase().includes(query.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAction) return
    // Validate required
    const missing = selectedAction.fields.filter((f) => f.required && !formValues[f.name]?.trim())
    if (missing.length > 0) {
      addToast({
        title: 'Field wajib kosong',
        message: `${missing.map((m) => m.placeholder || m.name).join(', ')} harus diisi`,
        type: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      const values: Record<string, unknown> = {}
      for (const f of selectedAction.fields) {
        const v = formValues[f.name]
        if (v) values[f.name] = v
      }
      const result = await submitQuickAdd(selectedAction, values)
      addToast({
        title: 'Berhasil dibuat',
        message: `${selectedAction.label.replace('Tambah ', '')} berhasil ditambahkan.`,
        type: 'success',
      })
      // Invalidate queries by table name
      window.dispatchEvent(new CustomEvent('quick-add-success', { detail: { table: selectedAction.table, row: result } }))
      router.refresh()
      onOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat'
      addToast({
        title: 'Gagal',
        message: msg,
        type: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4',
            'border border-[var(--color-border-default)] bg-[var(--color-surface-3)] p-6 shadow-2xl',
            'rounded-xl duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          {!selectedAction ? (
            <>
              <DialogPrimitive.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
                Buat Cepat
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-[var(--color-text-tertiary)]">
                Pilih tipe data yang ingin ditambahkan. Tekan huruf shortcut untuk akses cepat.
              </DialogPrimitive.Description>

              <Input
                ref={inputRef as any}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari aksi..."
                aria-label="Cari quick-add"
                autoComplete="off"
              />

              <div className="max-h-[280px] overflow-y-auto space-y-1 -mx-2 px-2">
                {filtered.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-tertiary)] py-4 text-center">
                    Tidak ada aksi cocok.
                  </p>
                ) : (
                  filtered.map((action) => {
                    const Icon = action.icon
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => setSelectedAction(action)}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left hover:bg-[var(--color-surface-2)]/80 transition-colors"
                      >
                        <span className="h-8 w-8 rounded-md bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)] flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-[var(--color-text-primary)]">
                            {action.label}
                          </span>
                          {action.hint && (
                            <span className="block text-xs text-[var(--color-text-tertiary)] mt-0.5">
                              {action.hint}
                            </span>
                          )}
                        </span>
                        {action.shortcut && (
                          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] border border-[var(--color-border-default)]">
                            {action.shortcut.toUpperCase()}
                          </kbd>
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border-default)]">
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="sm">Batal</Button>
                </DialogPrimitive.Close>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAction(null)}
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                >
                  ← Kembali
                </button>
              </div>
              <DialogPrimitive.Title className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                <selectedAction.icon className="h-5 w-5 text-[var(--color-brand-500)]" />
                {selectedAction.label}
              </DialogPrimitive.Title>

              <form onSubmit={handleSubmit} className="space-y-3">
                {selectedAction.fields.map((f) => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                      {f.placeholder || f.name}
                      {f.required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
                    </label>
                    {f.kind === 'longtext' ? (
                      <textarea
                        value={formValues[f.name] ?? ''}
                        onChange={(e) => setFormValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
                        aria-label={f.placeholder || f.name}
                        required={f.required}
                        autoFocus={f === selectedAction.fields[0]}
                      />
                    ) : (
                      <Input
                        value={formValues[f.name] ?? ''}
                        onChange={(e) => setFormValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                        placeholder={f.placeholder}
                        aria-label={f.placeholder || f.name}
                        required={f.required}
                        autoFocus={f === selectedAction.fields[0]}
                      />
                    )}
                  </div>
                ))}

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border-default)]">
                  <Button type="button" variant="ghost" onClick={() => setSelectedAction(null)} disabled={submitting}>
                    Kembali
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    ) : (
                      <Plus className="h-3 w-3 mr-1.5" />
                    )}
                    Buat
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
