// app/(dashboard)/owner/projects/ProjectCreateForm.tsx
// Plan C Phase 2 — Project create form.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Cluster { id: string; code: string; name: string }

export function ProjectCreateForm({ clusters }: { clusters: Cluster[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [form, setForm] = useState({
    code: '', name: '', cluster_id: clusters[0]?.id ?? '',
    total_units: '60', start_date: '', target_completion_date: '',
    budget_rupiah: '0',
  })

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.cluster_id || !form.start_date) {
      setMsg({ type: 'err', text: 'Nama, cluster, dan tanggal wajib.' })
      return
    }
    setBusy(true); setMsg(null)
    try {
      const body = {
        code: form.code.trim() || null,
        name: form.name.trim(),
        cluster_id: form.cluster_id,
        total_units: Number(form.total_units),
        start_date: form.start_date,
        target_completion_date: form.target_completion_date || form.start_date,
        budget_rupiah: Number(form.budget_rupiah),
        spent_rupiah: 0,
        status: 'planning',
      }
      const res = await fetch('/api/projects/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsg({ type: 'err', text: j.error ?? `HTTP ${res.status}` })
        return
      }
      setMsg({ type: 'ok', text: 'Project dibuat.' })
      setForm({ ...form, name: '', code: '' })
      router.refresh()
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message ?? 'Network error' })
    } finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4" /> Project baru
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Cluster</label>
            <select value={form.cluster_id} onChange={(e) => set('cluster_id', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20">
              {clusters.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Code (auto-generated jika kosong)</label>
            <input type="text" value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="PRJ-BSA-01"
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Name</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} required
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Total units</label>
            <input type="number" min="1" value={form.total_units} onChange={(e) => set('total_units', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Start date</label>
            <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Target completion</label>
            <input type="date" value={form.target_completion_date} onChange={(e) => set('target_completion_date', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Budget (IDR)</label>
            <input type="number" min="0" value={form.budget_rupiah} onChange={(e) => set('budget_rupiah', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
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
