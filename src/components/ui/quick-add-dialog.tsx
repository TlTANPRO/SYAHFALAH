// components/ui/quick-add-dialog.tsx
// Quick-add modal accessible from Cmd+K. Shows the QUICK_ADD_ACTIONS
// registry. Pick an action → minimal form appears → submit → toast + close.
//
// AI suggestions: fields flagged with `aiSuggestion: true` get a debounced
// async fetch to /api/ai/suggest-field while the user types. Suggestions
// appear in a dropdown beside the input. Clicking a suggestion fills the
// field. AI is opt-in: a slow/missing endpoint never blocks submission.

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Loader2, Plus, Sparkles } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import {
  QUICK_ADD_ACTIONS,
  submitQuickAdd,
  suggestFieldValues,
  type QuickAddAction,
  type QuickAddField,
} from '@/lib/quick-add'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

interface QuickAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AI_DEBOUNCE_MS = 600
const AI_MIN_CHARS = 2

export function QuickAddDialog({ open, onOpenChange }: QuickAddDialogProps) {
  const [query, setQuery] = React.useState('')
  const [selectedAction, setSelectedAction] = React.useState<QuickAddAction | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [formValues, setFormValues] = React.useState<Record<string, string>>({})
  // AI suggestions per field name → up to 3 strings
  const [aiSuggestions, setAiSuggestions] = React.useState<Record<string, string[]>>({})
  // Track which field's dropdown is currently open
  const [openSuggestionField, setOpenSuggestionField] = React.useState<string | null>(null)
  // Per-field loading state for the spinner
  const [aiLoadingField, setAiLoadingField] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const aiAbortRef = React.useRef<AbortController | null>(null)
  const aiToastShownRef = React.useRef<Set<string>>(new Set())
  const addToast = useUIStore((s) => s.addToast)
  const router = useRouter()

  React.useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedAction(null)
      setFormValues({})
      setAiSuggestions({})
      setOpenSuggestionField(null)
      setAiLoadingField(null)
      aiAbortRef.current?.abort()
      aiToastShownRef.current = new Set()
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    return () => {
      aiAbortRef.current?.abort()
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

  // Debounced AI suggestions — fires when the user types into a field with
  // aiSuggestion: true. Cancels any in-flight request when the user keeps
  // typing so we never render stale results.
  const debounceTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const requestAiSuggestions = React.useCallback(
    (action: QuickAddAction, field: QuickAddField, partial: string) => {
      const fieldName = field.name
      // Clear any pending fetch for this field
      const existingTimer = debounceTimers.current[fieldName]
      if (existingTimer) clearTimeout(existingTimer)

      // Below min chars? clear suggestions and bail
      if (!partial || partial.trim().length < AI_MIN_CHARS) {
        setAiSuggestions((prev) => {
          if (!prev[fieldName]?.length) return prev
          const { [fieldName]: _drop, ...rest } = prev
          return rest
        })
        setAiLoadingField(null)
        return
      }

      setAiLoadingField(fieldName)
      debounceTimers.current[fieldName] = setTimeout(async () => {
        // Cancel previous in-flight request
        aiAbortRef.current?.abort()
        const controller = new AbortController()
        aiAbortRef.current = controller

        // Build context from sibling fields
        const ctx: Record<string, unknown> = {}
        for (const f of action.fields) {
          if (f.name === fieldName) continue
          const v = formValues[f.name]
          if (v) ctx[f.name] = v
        }
        if (action.id) ctx['action_id'] = action.id
        if (action.table) ctx['table'] = action.table

        const result = await suggestFieldValues({
          entity: action.table,
          field: fieldName,
          partial,
          context: ctx,
          signal: controller.signal,
        })

        // Stale response? bail
        if (controller.signal.aborted) return
        setAiLoadingField(null)
        setAiSuggestions((prev) => ({ ...prev, [fieldName]: result.suggestions }))

        // Fire the 3rd state toast — once per field per dialog open
        if (
          result.suggestions.length > 0 &&
          !aiToastShownRef.current.has(fieldName)
        ) {
          aiToastShownRef.current.add(fieldName)
          addToast({
            type: 'info',
            title: 'AI suggestion available',
            message: `Saran AI untuk ${field.placeholder || field.name} sudah siap (klik ikon ✨).`,
            duration: 3500,
          })
        }
      }, AI_DEBOUNCE_MS)
    },
    [addToast, formValues],
  )

  const applySuggestion = (fieldName: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }))
    setOpenSuggestionField(null)
  }

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
                {selectedAction.fields.map((f) => {
                  const showAi = !!f.aiSuggestion
                  const suggestions = showAi ? aiSuggestions[f.name] ?? [] : []
                  const showDropdown =
                    showAi && openSuggestionField === f.name && suggestions.length > 0
                  return (
                    <div key={f.name} className="relative">
                      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                        {f.placeholder || f.name}
                        {f.required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
                        {showAi && (
                          <span
                            className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-brand-500)]"
                            title="Field ini mendukung saran AI"
                          >
                            <Sparkles className="h-3 w-3" />
                            AI
                          </span>
                        )}
                      </label>
                      {f.kind === 'longtext' ? (
                        <textarea
                          value={formValues[f.name] ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            setFormValues((prev) => ({ ...prev, [f.name]: v }))
                            if (showAi) requestAiSuggestions(selectedAction, f, v)
                          }}
                          onFocus={() => {
                            if (showAi && (aiSuggestions[f.name]?.length ?? 0) > 0) {
                              setOpenSuggestionField(f.name)
                            }
                          }}
                          onBlur={() => {
                            // Delay so the click on a suggestion registers first
                            setTimeout(() => setOpenSuggestionField((cur) => (cur === f.name ? null : cur)), 150)
                          }}
                          rows={3}
                          className="w-full px-3 py-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
                          aria-label={f.placeholder || f.name}
                          required={f.required}
                          autoFocus={f === selectedAction.fields[0]}
                        />
                      ) : (
                        <div className="relative">
                          <Input
                            value={formValues[f.name] ?? ''}
                            onChange={(e) => {
                              const v = e.target.value
                              setFormValues((prev) => ({ ...prev, [f.name]: v }))
                              if (showAi) requestAiSuggestions(selectedAction, f, v)
                            }}
                            onFocus={() => {
                              if (showAi && (aiSuggestions[f.name]?.length ?? 0) > 0) {
                                setOpenSuggestionField(f.name)
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => setOpenSuggestionField((cur) => (cur === f.name ? null : cur)), 150)
                            }}
                            placeholder={f.placeholder}
                            aria-label={f.placeholder || f.name}
                            required={f.required}
                            autoFocus={f === selectedAction.fields[0]}
                            className="pr-8"
                          />
                          {showAi && aiLoadingField === f.name && (
                            <Loader2
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[var(--color-brand-500)]"
                              aria-label="Memuat saran AI"
                            />
                          )}
                        </div>
                      )}
                      {showDropdown && (
                        <div
                          role="listbox"
                          aria-label={`Saran AI untuk ${f.placeholder || f.name}`}
                          className="absolute z-10 left-0 right-0 mt-1 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-2)] shadow-lg overflow-hidden"
                        >
                          <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)] border-b border-[var(--color-border-default)] flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-[var(--color-brand-500)]" />
                            Saran AI
                          </div>
                          {suggestions.map((s, i) => (
                            <button
                              key={`${f.name}-${i}-${s}`}
                              type="button"
                              role="option"
                              aria-selected="false"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applySuggestion(f.name, s)}
                              className="w-full text-left px-3 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-brand-500)]/10 focus:bg-[var(--color-brand-500)]/10 focus:outline-none"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

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
