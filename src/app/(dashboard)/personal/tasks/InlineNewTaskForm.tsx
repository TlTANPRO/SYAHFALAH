// app/(dashboard)/personal/tasks/InlineNewTaskForm.tsx
// Inline "Tambah Task" form — provides a visible entry point for adding
// tasks without requiring Cmd+Shift+K or going through QuickAdd dialog.
// Posts to /api/tasks, invalidates the React Query cache on success.

'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUIStore } from '@/stores/uiStore'

interface InlineNewTaskFormProps {
  onCreated?: () => void
}

export function InlineNewTaskForm({ onCreated }: InlineNewTaskFormProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  const create = useMutation({
    mutationFn: async (input: { title: string; priority: string }) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: input.title,
          priority: input.priority,
          status: 'pending',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const message =
          err?.error?.message ??
          (typeof err?.error === 'string' ? err.error : null) ??
          `HTTP ${res.status}`
        // Log full body to console so devs can see exact reason
        if (typeof console !== 'undefined') {
          console.error('[InlineNewTaskForm] POST /api/tasks failed', { status: res.status, body: err })
        }
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Berhasil dibuat', message: 'Task baru telah ditambahkan.' })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setTitle('')
      setPriority('medium')
      setOpen(false)
      onCreated?.()
    },
    onError: (err: Error) => {
      addToast({ type: 'destructive', title: 'Gagal', message: err.message })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim().length < 3) {
      addToast({ type: 'warning', title: 'Judul minimal 3 karakter' })
      return
    }
    create.mutate({ title: title.trim(), priority })
  }

  if (!open) {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-1)]/50 px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-brand-500)]/50 transition-colors"
          data-testid="inline-new-task-trigger"
          aria-label="Buka form tambah task"
        >
          <Plus className="h-4 w-4" />
          Tambah Task
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-1.5 min-h-5 text-[10px] font-mono text-[var(--color-text-tertiary)]">
            <Plus className="h-2.5 w-2.5" />
          </kbd>
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-1)] p-4 space-y-3"
      data-testid="inline-new-task-form"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Tambah Task Baru
        </h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setTitle('') }}
          className="p-1 rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)]"
          aria-label="Tutup form"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <label htmlFor="new-task-title" className="text-xs font-medium text-[var(--color-text-secondary)]">
          Judul
        </label>
        <Input
          id="new-task-title"
          name="new-task-title"
          autoFocus
          placeholder="Misal: Review kontrak supplier Semen"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={create.isPending}
          className="h-10"
          maxLength={120}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="new-task-priority" className="text-xs text-[var(--color-text-secondary)]">
            Prioritas
          </label>
          <select
            id="new-task-priority"
            name="new-task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
            disabled={create.isPending}
            className="h-9 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-1)] px-2 text-sm"
          >
            <option value="low">Rendah</option>
            <option value="medium">Sedang</option>
            <option value="high">Tinggi</option>
            <option value="critical">Kritis</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setOpen(false); setTitle('') }}
            disabled={create.isPending}
          >
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={create.isPending || title.trim().length < 3}
            data-testid="inline-new-task-submit"
          >
            {create.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Membuat...
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Buat Task
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}