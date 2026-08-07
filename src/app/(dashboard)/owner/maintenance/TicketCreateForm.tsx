// app/(dashboard)/owner/maintenance/TicketCreateForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const

export function TicketCreateForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', priority: 'normal', category: '',
    customer_id: '', house_unit_id: '',
  })
  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setMsg({ type: 'err', text: 'Judul wajib.' }); return }
    setBusy(true); setMsg(null)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        category: form.category.trim() || null,
        customer_id: form.customer_id.trim() || null,
        house_unit_id: form.house_unit_id.trim() || null,
        status: 'open',
      }
      const res = await fetch('/api/maintenance/maintenance_tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsg({ type: 'err', text: j.error ?? `HTTP ${res.status}` }); return
      }
      setMsg({ type: 'ok', text: 'Ticket dibuat.' })
      setForm({ title: '', description: '', priority: 'normal', category: '', customer_id: '', house_unit_id: '' })
      router.refresh()
    } catch (e: any) { setMsg({ type: 'err', text: e?.message ?? 'Network error' }) }
    finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Ticket baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label htmlFor="ticket-title" className="block text-xs text-[var(--color-text-tertiary)] mb-1">Title *</label>
            <input id="ticket-title" name="title" type="text" autoComplete="off" value={form.title} onChange={(e) => set('title', e.target.value)} required
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label htmlFor="ticket-priority" className="block text-xs text-[var(--color-text-tertiary)] mb-1">Priority</label>
            <select id="ticket-priority" name="priority" autoComplete="off" value={form.priority} onChange={(e) => set('priority', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="ticket-description" className="block text-xs text-[var(--color-text-tertiary)] mb-1">Description</label>
            <input id="ticket-description" name="description" type="text" autoComplete="off" value={form.description} onChange={(e) => set('description', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label htmlFor="ticket-category" className="block text-xs text-[var(--color-text-tertiary)] mb-1">Category</label>
            <input id="ticket-category" name="category" type="text" autoComplete="off" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="plumbing/electrical/etc"
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label htmlFor="ticket-customer-id" className="block text-xs text-[var(--color-text-tertiary)] mb-1">Customer ID (UUID, opsional)</label>
            <input id="ticket-customer-id" name="customer_id" type="text" autoComplete="off" value={form.customer_id} onChange={(e) => set('customer_id', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-xs font-mono focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label htmlFor="ticket-house-unit-id" className="block text-xs text-[var(--color-text-tertiary)] mb-1">House Unit ID (UUID, opsional)</label>
            <input id="ticket-house-unit-id" name="house_unit_id" type="text" autoComplete="off" value={form.house_unit_id} onChange={(e) => set('house_unit_id', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-xs font-mono focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div className="md:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={busy} aria-label="Buat ticket pemeliharaan"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[var(--color-brand-500)] text-white text-sm font-medium hover:bg-[var(--color-brand-600)] disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Submit
            </button>
            {msg && <span className={`text-xs ${msg.type === 'ok' ? 'text-[var(--color-verdigris-500)]' : 'text-[var(--color-danger)]'}`}>{msg.text}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
