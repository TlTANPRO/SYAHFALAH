// personal/notifications/page.tsx
// Notifikasi personal. Pakai design tokens, copy manusia.
// Schema matches migration 020 (notifications table with title/body/link/payload/is_read).
// Mark-read actions call /api/notifications endpoint.

import { createClient } from '@supabase/supabase-js'
import { Bell, Info, AlertTriangle, CheckCircle2, MailOpen } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { ListFilters } from '@/components/ui/ListFilters'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
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

interface PageProps { searchParams: Promise<{ q?: string; unread?: string }> }

async function load(userId: string, q: string | null = null, unread: string | null = null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  let r = supabase.from('notifications').select('id, title, body, link, is_read, read_at, payload, created_at').eq('user_id', userId)
  if (q) r = r.ilike('title', `%${q}%`)
  if (unread === '1') r = r.eq('is_read', false)
  const { data } = await r.order('created_at', { ascending: false }).limit(100)
  return (data ?? []) as Notif[]
}

function fmtWhen(s: string): string {
  return new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function Page({ searchParams }: PageProps) {
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

  const sp = await searchParams
  const q = sp.q?.trim() || null
  const unread = sp.unread || null
  const notifs = uid ? await load(uid, q, unread) : []
  const unreadCount = notifs.filter(n => !n.is_read).length
  const filtered = Boolean(q || unread)
  const activeUnread = unread === '1'

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: 'Personal', href: '/personal' }, { label: 'Notifikasi' }]} />
      <div>
        <h1 className="display-lg flex items-center gap-2">
          <Bell className="h-6 w-6 text-[var(--color-brand-500)]" />
          Notifikasi
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {filtered
            ? `${notifs.length} hasil${activeUnread ? ' (unread only)' : ''}.`
            : unreadCount > 0
              ? `${unreadCount} belum dibaca dari total ${notifs.length}.`
              : notifs.length > 0
                ? `Semua sudah dibaca. Total ${notifs.length}.`
                : 'Belum ada notifikasi.'}
        </p>
      </div>

      <ListFilters
        basePath="/personal/notifications"
        searchPlaceholder="Cari notifikasi (judul)…"
        searchValue={q ?? ''}
        extraParams={{ unread: unread ?? '' }}
        chips={[
          { label: 'Semua',          value: '',  active: !unread, param: 'unread' },
          { label: 'Belum dibaca',  value: '1', active: unread === '1', param: 'unread', count: unread === '1' ? notifs.length : undefined },
        ]}
      />

      {notifs.length > 0 && <MarkReadActions totalUnread={unreadCount} />}

      <div className="space-y-2">
        {notifs.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filtered ? 'Tidak ada notifikasi sesuai filter' : 'Belum ada notifikasi'}
            description={filtered ? 'Coba ubah kata kunci atau pilih tab Semua.' : 'Update penting akan muncul di sini.'}
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
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1 font-mono">
                      {fmtWhen(n.created_at)}
                      {n.link && (
                        <> · <a href={n.link} className="text-[var(--color-brand-500)] hover:underline">{n.link}</a></>
                      )}
                    </p>
                    {/* Cross-link to /owner/approvals for approval-related notifications. */}
                    {(() => {
                      const isApproval = (kind.includes('approval') || /approval|persetujuan|approve/i.test(n.title))
                      if (!isApproval) return null
                      return (
                        <a href="/owner/approvals" className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-brand-500)] hover:underline">
                          Buka Persetujuan →
                        </a>
                      )
                    })()}
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
