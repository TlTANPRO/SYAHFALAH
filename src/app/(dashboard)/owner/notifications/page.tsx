// owner/notifications/page.tsx
// Owner scope: see all notifications across the org (owner/kepala_kantor only).
// Reuses personal layout pattern; this is the broadcast/oversight view.

import { createClient } from '@supabase/supabase-js'
import { Bell, Info, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface Notif {
  id: string
  user_id: string
  title: string
  body: string
  link: string | null
  is_read: boolean
  read_at: string | null
  payload: Record<string, unknown>
  created_at: string
}

async function loadAll() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return [] as Notif[]
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data } = await supabase
    .from('notifications')
    .select('id, user_id, title, body, link, is_read, read_at, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []) as Notif[]
}

function fmtWhen(s: string): string {
  return new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function Page() {
  const notifs = await loadAll()
  const unread = notifs.filter(n => !n.is_read).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg flex items-center gap-2">
          <Bell className="h-6 w-6 text-[var(--color-brand-500)]" />
          Notifikasi Org
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {unread > 0 ? `${unread} belum dibaca.` : notifs.length > 0 ? `Semua terbaca, total ${notifs.length}.` : 'Belum ada notifikasi.'}
        </p>
      </div>

      {notifs.length === 0 ? (
        <EmptyState icon={Bell} title="Belum ada notifikasi" description="Broadcast/announcement akan muncul di sini." />
      ) : (
        <div className="space-y-2">
          {notifs.map(n => {
            const kind = (n.payload as any)?.kind ?? ''
            let Icon = Info
            if (kind.includes('urgent') || /urgent|⚠/i.test(n.title)) Icon = AlertTriangle
            else if (kind.includes('completed') || /selesai/i.test(n.title)) Icon = CheckCircle2
            return (
              <div key={n.id} className={`card ${!n.is_read ? 'border-l-2 border-l-[var(--color-brand-500)]' : ''}`}>
                <div className="card-body flex items-start gap-3">
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${!n.is_read ? 'text-[var(--color-brand-500)]' : 'text-[var(--color-text-tertiary)]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium">{n.title}</p>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-[var(--color-brand-500)]" />}
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{n.body}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1 font-mono">
                      {fmtWhen(n.created_at)} · user {n.user_id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
