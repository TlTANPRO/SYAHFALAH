// components/notification/NotificationBell.tsx
// Notification bell with dropdown

'use client'

import { useState } from 'react'
import { Bell, CheckCircle, AlertTriangle, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatRelativeTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  reference_id?: string | null
  reference_type?: string | null
  priority: string
}

export function NotificationBell() {
  const { user } = useAuthStore()
  const supabase = createClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as Notification[]
    },
    refetchInterval: 30000,
    enabled: !!user?.id,
  })

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  const getIcon = (type: string) => {
    switch (type) {
      case 'morning_brief': return <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
      case 'deadline_approaching': return <Clock className="h-4 w-4 text-[var(--color-warning)]" />
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-[var(--color-danger)]" />
      case 'kpi_at_risk': return <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
      default: return <Bell className="h-4 w-4 text-[var(--color-info)]" />
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      morning_brief: 'Morning Brief',
      deadline_approaching: 'Deadline Approaching',
      overdue: 'Overdue',
      new_task: 'New Task',
      carry_over: 'Carry-over',
      kpi_at_risk: 'KPI At Risk',
      mention: 'Mention',
      approval_request: 'Approval Request',
    }
    return labels[type] || type
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
        ) : notifications?.length === 0 ? (
          <div className="py-4 text-center text-[var(--color-text-secondary)]">Tidak ada notifikasi</div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
            {notifications?.map((notif) => (
              <DropdownMenuItem 
                key={notif.id} 
                className={`flex items-start gap-3 p-3 ${!notif.is_read ? 'bg-[var(--color-surface-2)]/50' : ''}`}
                onClick={() => {
                  // Mark as read - could add mutation here
                }}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{notif.title}</span>
                    <Badge variant="outline" className="text-xs">{getTypeLabel(notif.type)}</Badge>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">{notif.message}</p>
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