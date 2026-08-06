// components/notification/NotificationBell.tsx
// Notification bell with dropdown.
// /api/notifications returns { data: [], total, page, pageSize } — extract .data.

'use client'

import { useState } from 'react'
import { Bell, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatRelativeTime } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'

interface Notification {
  id: string
  title: string
  body: string
  link?: string | null
  is_read: boolean
  read_at?: string | null
  payload?: Record<string, unknown>
  created_at: string
}

export function NotificationBell() {
  const { user } = useAuthStore()
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const res = await fetch('/api/notifications?limit=20', { credentials: 'include' })
      if (!res.ok) return []
      const j = await res.json() as { data?: Notification[] }
      // /api/notifications returns { data, total, page, pageSize }; fallback to []
      return (j.data ?? []) as Notification[]
    },
    refetchInterval: 30000,
    enabled: !!user?.id,
  })

  const safe = Array.isArray(notifications) ? notifications : []
  const unreadCount = safe.filter(n => !n.is_read).length

  const getIcon = (n: Notification) => {
    const kind = (n.payload as any)?.kind ?? (n.payload as any)?.event ?? ''
    if (kind.includes('urgent') || /urgent|⚠/i.test(n.title)) return <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
    if (kind.includes('overdue') || /overdue/i.test(n.title)) return <AlertTriangle className="h-4 w-4 text-[var(--color-danger)]" />
    if (kind.includes('deadline') || /deadline/i.test(n.title)) return <Clock className="h-4 w-4 text-[var(--color-warning)]" />
    if (kind.includes('completed') || /selesai/i.test(n.title)) return <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
    return <Bell className="h-4 w-4 text-[var(--color-info)]" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[var(--color-danger)] text-destructive-foreground text-xs font-medium flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifikasi</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">{unreadCount} belum dibaca</Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="py-4 text-center text-[var(--color-text-secondary)]">Memuat...</div>
        ) : safe.length === 0 ? (
          <div className="py-4 text-center text-[var(--color-text-secondary)]">Tidak ada notifikasi</div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
            {safe.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={`flex items-start gap-3 p-3 ${!notif.is_read ? 'bg-[var(--color-surface-2)]/50' : ''}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(notif)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{notif.title}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">{notif.body}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">{formatRelativeTime(notif.created_at)}</p>
                </div>
                {!notif.is_read && (
                  <span className="h-2 w-2 rounded-full bg-[var(--color-brand-500)] flex-shrink-0 mt-1" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-center text-primary hover:bg-[var(--color-brand-500)]/10">
          Lihat semua notifikasi
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
