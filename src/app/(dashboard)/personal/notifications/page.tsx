// personal/notifications/page.tsx
// Notifikasi personal. Pakai design tokens, copy manusia.

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { Bell, CheckCircle2, AlertTriangle, Info, Award } from 'lucide-react'

interface Notif {
  id: string
  type: string
  title: string
  message: string | null
  priority: string
  is_read: boolean
  created_at: string
  reference_id: string | null
  reference_type: string | null
}

async function load(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, message, priority, is_read, created_at, reference_id, reference_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as Notif[]
}

const typeIcon: Record<string, any> = {
  task: CheckCircle2,
  alert: AlertTriangle,
  info: Info,
  reward: Award,
}
const PRIORITY_VARIANT: Record<string, string> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'danger',
}

export default async function Page() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const payload = token ? await verifyAccessToken(token) : null
  const userId = payload?.userId

  const notifs = userId ? await load(userId) : []
  const unread = notifs.filter(n => !n.is_read).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg">Notifikasi</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {unread > 0 ? `${unread} belum dibaca dari total ${notifs.length}.` : `Semua sudah dibaca. Total ${notifs.length}.`}
        </p>
      </div>

      <div className="space-y-2">
        {notifs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-12 text-center">
            <Bell className="h-12 w-12 text-[var(--color-text-tertiary)] mx-auto mb-3" />
            <h3 className="font-heading text-lg font-semibold mb-1">Belum ada notifikasi</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">Update penting akan muncul di sini.</p>
          </div>
        ) : (
          notifs.map(n => {
            const Icon = typeIcon[n.type] || Info
            return (
              <div key={n.id} className={`card ${!n.is_read ? 'border-l-2 border-l-[var(--color-brand-500)]' : ''}`}>
                <div className="card-body flex items-start gap-3">
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${!n.is_read ? 'text-[var(--color-brand-500)]' : 'text-[var(--color-text-tertiary)]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium">{n.title}</p>
                      <span className="pill" data-variant={PRIORITY_VARIANT[n.priority] || 'neutral'}>{n.priority}</span>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-[var(--color-brand-500)]" />}
                    </div>
                    {n.message && (
                      <p className="text-sm text-[var(--color-text-secondary)]">{n.message}</p>
                    )}
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1 font-mono">
                      {new Date(n.created_at).toLocaleString('id-ID')}
                    </p>
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
