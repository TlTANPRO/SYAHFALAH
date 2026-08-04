// owner/approvals/page.tsx
// Pending approvals for the owner. Uses the notifications table as the
// approval queue. Items with priority "urgent" or "high" are surfaced
// first; once we wire up an approvals-specific table this page will
// switch its source.

import { createClient } from '@supabase/supabase-js'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, Clock, AlertTriangle } from 'lucide-react'

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

const priorityVariant: Record<string, 'default' | 'info' | 'warning' | 'destructive'> = {
  low: 'default', normal: 'info', high: 'warning', urgent: 'destructive',
}

export default async function Page() {
  const notifs = await load()
  const pending = notifs.filter(n => !n.is_read).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Approvals</h1>
        <p className="text-muted-foreground">{pending} persetujuan menunggu · {notifs.length} notifikasi prioritas</p>
      </div>

      <div className="space-y-2">
        {notifs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckSquare className="h-12 w-12 text-success/70 mx-auto mb-4" />
              <h3 className="font-medium mb-1">Tidak ada persetujuan tertunda</h3>
              <p className="text-sm text-muted-foreground">Semua permintaan sudah diproses.</p>
            </CardContent>
          </Card>
        ) : (
          notifs.map(n => (
            <Card key={n.id} className={!n.is_read ? 'border-warning/30' : ''}>
              <CardContent className="p-4 flex items-start gap-3">
                {n.priority === 'urgent' ? (
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
                ) : (
                  <Clock className="h-4 w-4 mt-0.5 text-warning" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{n.title}</span>
                    <Badge variant={priorityVariant[n.priority] || 'default'}>{n.priority}</Badge>
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
          ))
        )}
      </div>
    </div>
  )
}
