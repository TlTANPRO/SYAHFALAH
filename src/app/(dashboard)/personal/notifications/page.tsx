// personal/notifications/page.tsx
// Personal notifications. Reads the notifications table joined with
// notifications_with_user view for author info.

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
const priorityVariant: Record<string, 'default' | 'info' | 'warning' | 'destructive'> = {
  low: 'default', normal: 'info', high: 'warning', urgent: 'destructive',
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
        <h1 className="font-heading text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">{unread} belum dibaca dari total {notifs.length}</p>
      </div>

      <div className="space-y-2">
        {notifs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-medium mb-1">Belum ada notifikasi</h3>
              <p className="text-sm text-muted-foreground">Notifikasi akan muncul di sini ketika ada update penting.</p>
            </CardContent>
          </Card>
        ) : (
          notifs.map(n => {
            const Icon = typeIcon[n.type] || Info
            return (
              <Card key={n.id} className={!n.is_read ? 'border-primary/30' : ''}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${!n.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{n.title}</span>
                      <Badge variant={priorityVariant[n.priority] || 'default'}>{n.priority}</Badge>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    {n.message && (
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
