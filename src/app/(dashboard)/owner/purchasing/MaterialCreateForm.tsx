// app/(dashboard)/owner/purchasing/MaterialCreateForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MaterialCreateForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [form, setForm] = useState({ name: '', category: '', unit: 'pcs', standard_price_rupiah: '0' })
  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setMsg({ type: 'err', text: 'Nama wajib.' }); return }
    setBusy(true); setMsg(null)
    try {
      const body = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        unit: form.unit.trim() || 'pcs',
        standard_price_rupiah: Number(form.standard_price_rupiah),
      }
      const res = await fetch('/api/purchasing/materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsg({ type: 'err', text: j.error ?? `HTTP ${res.status}` }); return
      }
      setMsg({ type: 'ok', text: 'Material dibuat.' })
      setForm({ name: '', category: '', unit: 'pcs', standard_price_rupiah: '0' })
      router.refresh()
    } catch (e: any) { setMsg({ type: 'err', text: e?.message ?? 'Network error' }) }
    finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Material baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Name *</label>
            <input name="input" type="text" value={form.name} onChange={(e) => set('name', e.target.value)} required
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Category</label>
            <input name="input" type="text" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="semen/besi/kayu/etc"
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Unit</label>
            <input name="input" type="text" value={form.unit} onChange={(e) => set('unit', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Standard price (IDR)</label>
            <input name="input" type="number" min="0" value={form.standard_price_rupiah} onChange={(e) => set('standard_price_rupiah', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div className="md:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={busy}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[var(--color-brand-500)] text-white text-sm font-medium hover:bg-[var(--color-brand-600)] disabled:opacity-50">
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
