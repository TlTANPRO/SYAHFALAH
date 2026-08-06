// app/(dashboard)/owner/projects/HouseUnitCreateForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Block { id: string; name: string; project_id: string }

const STATUS_OPTS = ['available', 'reserved', 'booked', 'sold', 'handed_over'] as const

export function HouseUnitCreateForm({ blocks }: { blocks: Block[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [form, setForm] = useState({
    block_id: blocks[0]?.id ?? '', unit_number: '', type: '', size_m2: '0',
    price_rupiah: '0', status: 'available', notes: '',
  })
  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.block_id || !form.unit_number.trim()) {
      setMsg({ type: 'err', text: 'Block + unit number wajib.' }); return
    }
    setBusy(true); setMsg(null)
    try {
      const body = {
        block_id: form.block_id,
        unit_number: form.unit_number.trim(),
        type: form.type.trim() || null,
        size_m2: Number(form.size_m2),
        price_rupiah: Number(form.price_rupiah),
        status: form.status,
        notes: form.notes.trim() || null,
      }
      const res = await fetch('/api/projects/house_units', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsg({ type: 'err', text: j.error ?? `HTTP ${res.status}` }); return
      }
      setMsg({ type: 'ok', text: 'Unit dibuat.' })
      setForm({ ...form, unit_number: '' })
      router.refresh()
    } catch (e: any) { setMsg({ type: 'err', text: e?.message ?? 'Network error' }) }
    finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4" /> House Unit baru
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Block</label>
            <select value={form.block_id} onChange={(e) => set('block_id', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20">
              {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Unit number</label>
            <input type="text" value={form.unit_number} onChange={(e) => set('unit_number', e.target.value)} required
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Type (mis. 36/72)</label>
            <input type="text" value={form.type} onChange={(e) => set('type', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Size (m²)</label>
            <input type="number" min="0" step="0.01" value={form.size_m2} onChange={(e) => set('size_m2', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Price (IDR)</label>
            <input type="number" min="0" value={form.price_rupiah} onChange={(e) => set('price_rupiah', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20">
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={busy}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[var(--color-brand-500)] text-white text-sm font-medium hover:bg-[var(--color-brand-600)] transition-colors disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Submit
            </button>
            {msg && <span className={`text-xs ${msg.type === 'ok' ? 'text-emerald-500' : 'text-rose-500'}`}>{msg.text}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
