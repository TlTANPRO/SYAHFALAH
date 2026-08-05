// owner/approvals/ApprovalList.tsx
// Client component for the approvals list. Lets the user mark each
// notification as approved or rejected via direct Supabase mutation,
// matching the pattern used by personal/tasks/page.tsx (no API route,
// direct client query — keeps the surface small).

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, CheckSquare, Clock, Loader2, X } from 'lucide-react'

export interface Notif {
  id: string
  type: string
  title: string
  message: string | null
  priority: string
  is_read: boolean
  created_at: string
}

const PRIORITY_VARIANT: Record<string, string> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'danger',
}

export function ApprovalList({ notifs }: { notifs: Notif[] }) {
  const queryClient = useQueryClient()

  const decide = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          is_read: true,
          approval_status: action === 'approve' ? 'approved' : 'rejected',
        }),
      })
      if (!res.ok) throw new Error('Failed to update notification')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })

  if (notifs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-12 text-center">
        <CheckSquare className="h-12 w-12 text-[var(--color-success)] mx-auto mb-3" />
        <h3 className="font-heading text-lg font-semibold mb-1">Semua sudah diproses</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">Tidak ada persetujuan yang menunggu.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {notifs.map(n => {
        const busy = decide.isPending && decide.variables?.id === n.id
        return (
          <div key={n.id} className={`card ${!n.is_read ? 'border-l-2 border-l-[var(--color-warning)]' : ''}`}>
            <div className="card-body flex items-start gap-3">
              {n.priority === 'urgent' ? (
                <AlertTriangle className="h-4 w-4 mt-0.5 text-[var(--color-danger)] flex-shrink-0" />
              ) : (
                <Clock className="h-4 w-4 mt-0.5 text-[var(--color-warning)] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-medium">{n.title}</p>
                  <span className="pill" data-variant={PRIORITY_VARIANT[n.priority] || 'neutral'}>{n.priority}</span>
                </div>
                {n.message && (
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3">{n.message}</p>
                )}
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1 font-mono">
                  {new Date(n.created_at).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  type="button"
                  aria-label={`Setujui ${n.title}`}
                  disabled={busy}
                  onClick={() => decide.mutate({ id: n.id, action: 'approve' })}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-[var(--color-success)]/40 text-[var(--color-success)] hover:bg-[var(--color-success)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  aria-label={`Tolak ${n.title}`}
                  disabled={busy}
                  onClick={() => decide.mutate({ id: n.id, action: 'reject' })}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </button>
                {!n.is_read && (
                  <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)] text-center">
                    baru
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}