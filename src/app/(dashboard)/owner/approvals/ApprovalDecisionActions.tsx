// app/(dashboard)/owner/approvals/ApprovalDecisionActions.tsx
// Plan C Phase 1 Item 6 — Approve/Reject buttons per row.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2 } from 'lucide-react'

interface Props {
  id: string
}

export function ApprovalDecisionActions({ id }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function decide(decision: 'approve' | 'reject') {
    setBusy(decision)
    setErr(null)
    try {
      const res = await fetch(`/api/approvals/${id}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ decision }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.error ?? `HTTP ${res.status}`)
        return
      }
      router.refresh()
    } catch (e: any) {
      setErr(e?.message ?? 'Network error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => decide('approve')}
          disabled={busy !== null}
          aria-label="Approve"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
        >
          {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => decide('reject')}
          disabled={busy !== null}
          aria-label="Reject"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 transition-colors disabled:opacity-50"
        >
          {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </button>
      </div>
      {err && <p className="text-[10px] text-rose-500 max-w-[8rem] truncate" title={err}>{err}</p>}
    </div>
  )
}
