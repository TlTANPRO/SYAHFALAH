// app/(dashboard)/owner/marketing/CustomerCreateForm.tsx
// Plan C Phase 2 — Customer creation form.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CustomerCreateForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [ktpNumber, setKtpNumber] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (fullName.trim().length < 2) {
      setMsg({ type: 'err', text: 'Nama wajib (>= 2 karakter).' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/marketing/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          ktp_number: ktpNumber.trim() || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsg({ type: 'err', text: j.error ?? `HTTP ${res.status}` })
        return
      }
      setMsg({ type: 'ok', text: 'Customer dibuat.' })
      setFullName(''); setPhone(''); setEmail(''); setKtpNumber('')
      router.refresh()
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message ?? 'Network error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4" /> Customer baru
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label htmlFor="cust-name" className="block text-xs text-[var(--color-text-tertiary)] mb-1">Nama</label>
            <input id="cust-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label htmlFor="cust-phone" className="block text-xs text-[var(--color-text-tertiary)] mb-1">Phone</label>
            <input id="cust-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label htmlFor="cust-email" className="block text-xs text-[var(--color-text-tertiary)] mb-1">Email</label>
            <input id="cust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label htmlFor="cust-ktp" className="block text-xs text-[var(--color-text-tertiary)] mb-1">KTP</label>
            <input id="cust-ktp" type="text" value={ktpNumber} onChange={(e) => setKtpNumber(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div className="md:col-span-4 flex items-center gap-3">
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
