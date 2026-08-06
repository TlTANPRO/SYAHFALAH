// app/(dashboard)/owner/purchasing/SupplierCreateForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SupplierCreateForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [form, setForm] = useState({ name: '', contact_name: '', phone: '', email: '', address: '' })
  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.name.trim().length < 2) { setMsg({ type: 'err', text: 'Nama wajib.' }); return }
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/purchasing/suppliers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(form),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsg({ type: 'err', text: j.error ?? `HTTP ${res.status}` }); return
      }
      setMsg({ type: 'ok', text: 'Supplier dibuat.' })
      setForm({ name: '', contact_name: '', phone: '', email: '', address: '' })
      router.refresh()
    } catch (e: any) { setMsg({ type: 'err', text: e?.message ?? 'Network error' }) }
    finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Supplier baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { k: 'name' as const, l: 'Name', t: 'text', req: true },
            { k: 'contact_name' as const, l: 'Contact person', t: 'text' },
            { k: 'phone' as const, l: 'Phone', t: 'text' },
            { k: 'email' as const, l: 'Email', t: 'email' },
            { k: 'address' as const, l: 'Address', t: 'text' },
          ].map(f => (
            <div key={f.k}>
              <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">{f.l}{f.req && ' *'}</label>
              <input type={f.t} value={form[f.k]} onChange={(e) => set(f.k, e.target.value)} required={f.req}
                className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
            </div>
          ))}
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
