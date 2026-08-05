// app/(dashboard)/owner/approvals/ApprovalRequestForm.tsx
// Plan C Phase 1 Item 6 — Submit approval request form.

'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Send, Loader2 } from 'lucide-react'

const KINDS = [
  { v: 'general', l: 'Umum' },
  { v: 'spending', l: 'Pengeluaran' },
  { v: 'leave', l: 'Cuti' },
  { v: 'access', l: 'Akses' },
  { v: 'budget', l: 'Budget' },
  { v: 'sow', l: 'SOW' },
] as const

export function ApprovalRequestForm() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<typeof KINDS[number]['v']>('general')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (title.trim().length < 3) {
      setMsg({ type: 'err', text: 'Title minimal 3 karakter.' })
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { title: title.trim(), description: description.trim() || null, kind }
      if (amount && !Number.isNaN(Number(amount))) {
        body.amount = Number(amount)
      }
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsg({ type: 'err', text: j.error ?? `HTTP ${res.status}` })
        return
      }
      setMsg({ type: 'ok', text: 'Request submitted.' })
      setTitle('')
      setDescription('')
      setAmount('')
      setKind('general')
      // Trigger page reload via router refresh
      window.location.reload()
    } catch (err: any) {
      setMsg({ type: 'err', text: err?.message ?? 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label htmlFor="approval-title" className="block text-xs text-[var(--color-text-tertiary)] mb-1">Title</label>
          <input
            id="approval-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Cuti 3 hari, Pembelian server, dll."
            className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          />
        </div>
        <div>
          <label htmlFor="approval-kind" className="block text-xs text-[var(--color-text-tertiary)] mb-1">Jenis</label>
          <select
            id="approval-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
            className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          >
            {KINDS.map(k => <option key={k.v} value={k.v}>{k.l}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="approval-desc" className="block text-xs text-[var(--color-text-tertiary)] mb-1">Deskripsi (opsional)</label>
        <textarea
          id="approval-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
        />
      </div>
      {(kind === 'spending' || kind === 'budget') && (
        <div>
          <label htmlFor="approval-amount" className="block text-xs text-[var(--color-text-tertiary)] mb-1">Nominal (IDR, opsional)</label>
          <input
            id="approval-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5000000"
            min="0"
            className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          />
        </div>
      )}

      {msg && (
        <p className={`text-xs ${msg.type === 'ok' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[var(--color-brand-500)] text-white text-sm font-medium hover:bg-[var(--color-brand-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Submit
      </button>
    </form>
  )
}
