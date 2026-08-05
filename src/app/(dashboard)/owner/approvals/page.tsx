// owner/approvals/page.tsx
// Persetujuan eksekutif. Server-side load notifications with priority
// urgent/high; the interactive list (approve/reject) is delegated to
// ApprovalList.tsx (client component) so we can use react-query
// mutations without an extra API roundtrip.

import { createClient } from '@supabase/supabase-js'
import { ApprovalList, type Notif } from './ApprovalList'

export const dynamic = 'force-dynamic'

async function load(): Promise<Notif[]> {
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

      <ApprovalList notifs={notifs} />
    </div>
  )
}