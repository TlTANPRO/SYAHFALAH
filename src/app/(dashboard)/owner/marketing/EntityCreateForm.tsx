// app/(dashboard)/owner/marketing/EntityCreateForm.tsx
// Plan C Phase 2 — Generic create form for surveys/bookings/sp3k/akad.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  entity: 'surveys' | 'bookings' | 'sp3k' | 'akad'
}

const REQUIRED_FIELD: Record<Props['entity'], { label: string; field: string }> = {
  surveys: { label: 'Lead ID', field: 'lead_id' },
  bookings: { label: 'Lead ID', field: 'lead_id' },
  sp3k: { label: 'Booking ID', field: 'booking_id' },
  akad: { label: 'SP3K ID', field: 'sp3k_id' },
}

const STATUS_OPTIONS: Record<Props['entity'], { v: string; l: string }[]> = {
  surveys: [
    { v: 'pending', l: 'Pending' },
    { v: 'interested', l: 'Interested' },
    { v: 'not_interested', l: 'Not interested' },
    { v: 'revisit', l: 'Revisit' },
  ],
  bookings: [
    { v: 'pending', l: 'Pending' },
    { v: 'confirmed', l: 'Confirmed' },
    { v: 'cancelled', l: 'Cancelled' },
    { v: 'expired', l: 'Expired' },
  ],
  sp3k: [
    { v: 'pending', l: 'Pending' },
    { v: 'approved', l: 'Approved' },
    { v: 'rejected', l: 'Rejected' },
    { v: 'cancelled', l: 'Cancelled' },
  ],
  akad: [
    { v: 'scheduled', l: 'Scheduled' },
    { v: 'signed', l: 'Signed' },
    { v: 'cancelled', l: 'Cancelled' },
    { v: 'rescheduled', l: 'Rescheduled' },
  ],
}

export function EntityCreateForm({ entity }: Props) {
  const router = useRouter()
  const req = REQUIRED_FIELD[entity]
  const statuses = STATUS_OPTIONS[entity]
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Generic state object
  const [primary, setPrimary] = useState('')
  const [secondary, setSecondary] = useState('')  // customer_id
  const [status, setStatus] = useState(statuses[0].v)
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!primary.trim()) {
      setMsg({ type: 'err', text: `${req.label} wajib.` })
      return
    }
    setBusy(true); setMsg(null)
    try {
      const body: Record<string, unknown> = {
        [req.field]: primary.trim(),
        customer_id: secondary.trim() || null,
        status,
        notes: notes.trim() || null,
      }
      if (date) {
        if (entity === 'surveys') body.scheduled_date = date
        else if (entity === 'bookings') body.booking_date = date
        else if (entity === 'akad') body.scheduled_date = date
      }
      const res = await fetch(`/api/marketing/${entity}`, {
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
      setMsg({ type: 'ok', text: 'Berhasil dibuat.' })
      setPrimary(''); setSecondary(''); setDate(''); setNotes('')
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
        <CardTitle className="text-base flex items-center gap-2 capitalize">
          <Plus className="h-4 w-4" /> {entity} baru
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">{req.label} (UUID)</label>
            <input name="input" type="text" value={primary} onChange={(e) => setPrimary(e.target.value)} required
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-xs font-mono focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Customer ID (UUID, opsional)</label>
            <input name="input" type="text" value={secondary} onChange={(e) => setSecondary(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-xs font-mono focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20">
              {statuses.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Tanggal</label>
            <input name="input" type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">Notes</label>
            <input name="input" type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
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
