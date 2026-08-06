// Mark-read action button.
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'

export function MarkReadActions({ totalUnread }: { totalUnread: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function markAll() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsg(j.error ?? `HTTP ${res.status}`)
        return
      }
      setMsg('OK')
      router.refresh()
    } catch (e: any) { setMsg(e?.message ?? 'Network error') }
    finally { setBusy(false) }
  }

  if (totalUnread === 0) return null

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={markAll} disabled={busy}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-[var(--color-brand-500)] text-white text-xs font-medium hover:bg-[var(--color-brand-600)] disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Tandai semua dibaca ({totalUnread})
      </button>
      {msg && <span className="text-xs text-[var(--color-text-tertiary)]">{msg}</span>}
    </div>
  )
}
