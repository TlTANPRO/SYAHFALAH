// owner/approvals/page.tsx
// Persetujuan eksekutif. Pakai tabel notifications dengan priority
// urgent/high. Sudah punya data morning briefings dari sebelumnya.

import { createClient } from '@supabase/supabase-js'
import { CheckSquare, Clock, AlertTriangle, FileSignature } from 'lucide-react'

interface Notif {
  id: string
  type: string
  title: string
  message: string | null
  priority: string
  is_read: boolean
  created_at: string
}

async function load() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, message, priority, is_read, created_at')
    .in('priority', ['urgent', 'high'])
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as Notif[]
}

const PRIORITY_VARIANT: Record<string, string> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'danger',
}

export default async function Page() {
  const notifs = await load()
  const pending = notifs.filter(n => !n.is_read).length
  const urgent = notifs.filter(n => n.priority === 'urgent').length
  const high = notifs.filter(n => n.priority === 'high').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg">Persetujuan</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {pending} belum dibaca · {urgent} urgent · {high} high. Review dari yang paling urgent.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card">
          <div className="card-body p-3">
            <p className="text-xs text-[var(--color-text-tertiary)]">Total</p>
            <p className="font-mono text-2xl font-bold tabular-nums">{notifs.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-3">
            <p className="text-xs text-[var(--color-text-tertiary)]">Urgent</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-[var(--color-danger)]">{urgent}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-3">
            <p className="text-xs text-[var(--color-text-tertiary)]">High</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-[var(--color-warning)]">{high}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {notifs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-12 text-center">
            <CheckSquare className="h-12 w-12 text-[var(--color-success)] mx-auto mb-3" />
            <h3 className="font-heading text-lg font-semibold mb-1">Semua sudah diproses</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">Tidak ada persetujuan yang menunggu.</p>
          </div>
        ) : (
          notifs.map(n => (
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
                <FileSignature className="h-4 w-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
