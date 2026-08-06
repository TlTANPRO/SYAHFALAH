// personal/notifications/page.tsx
// Notifikasi personal. Pakai design tokens, copy manusia.
// Schema matches migration 020 (notifications table with title/body/link/payload/is_read).
// Mark-read actions call /api/notifications endpoint.

import { createClient } from '@supabase/supabase-js'
import { Bell, Info, AlertTriangle, CheckCircle2, MailOpen } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { MarkReadActions } from './MarkReadActions'

interface Notif {
  id: string
  title: string
  body: string
  link: string | null
  is_read: boolean
  read_at: string | null
  payload: Record<string, unknown>
  created_at: string
}

async function load(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data } = await supabase
    .from('notifications')
    .select('id, title, body, link, is_read, read_at, payload, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []) as Notif[]
}

function fmtWhen(s: string): string {
  return new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function Page() {
  let uid: string | null = null
  {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (token) {
      const { verifyAccessToken } = await import('@/lib/auth/jwt')
      const p = await verifyAccessToken(token)
      uid = p?.userId ?? null
    }
  }

  const notifs = uid ? await load(uid) : []
  const unread = notifs.filter(n => !n.is_read).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg flex items-center gap-2">
          <Bell className="h-6 w-6 text-[var(--color-brand-500)]" />
          Notifikasi
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {unread > 0
            ? `${unread} belum dibaca dari total ${notifs.length}.`
            : notifs.length > 0
            ? `Semua sudah dibaca. Total ${notifs.length}.`
            : 'Belum ada notifikasi.'}
        </p>
      </div>

      {notifs.length > 0 && <MarkReadActions totalUnread={unread} />}

      <div className="space-y-2">
        {notifs.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Belum ada notifikasi"
            description="Update penting akan muncul di sini."
          />
        ) : (
          notifs.map(n => {
            // Heuristic icon from payload.kind or title keyword
            const kind = (n.payload as any)?.kind ?? (n.payload as any)?.event ?? ''
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
                      {!n.is_read && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-brand-500)] font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)]" />
                          BARU
                        </span>
                      )}
                      {n.read_at && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
                          <MailOpen className="h-3 w-3" />
                          dibaca
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{n.body}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1 font-mono">{fmtWhen(n.created_at)}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
