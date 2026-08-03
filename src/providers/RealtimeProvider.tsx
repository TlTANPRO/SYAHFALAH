// providers/RealtimeProvider.tsx
// Realtime subscriptions for tasks, KPIs, notifications

'use client'

import { useEffect, type ReactNode } from 'react'
import { useSupabase } from './SupabaseProvider'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useQueryClient } from './QueryProvider'

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { supabase, subscribe } = useSupabase()
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return

    const userId = user.id
    const divisionId = user.divisionId

    // Subscribe to personal tasks
    const tasksChannel = subscribe(`tasks:${userId}`, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      
      // Show toast for important updates
      if (payload.new?.status === 'completed' && payload.old?.status !== 'completed') {
        addToast({
          type: 'success',
          title: 'Task Completed',
          message: payload.new.title,
        })
      }
    })

    // Subscribe to KPI updates
    const kpiChannel = subscribe(`kpis:${divisionId}`, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] })
      queryClient.invalidateQueries({ queryKey: ['kpi-cascade'] })
    })

    // Subscribe to notifications
    const notifChannel = subscribe(`notifications:${userId}`, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      
      // Show toast for new notifications
      if (payload.new) {
        const notif = payload.new
        const toastType = notif.type === 'overdue' || notif.type === 'deadline_approaching' 
          ? 'destructive' 
          : notif.type === 'kpi_at_risk' 
            ? 'warning' 
            : 'info'
        
        addToast({
          type: toastType,
          title: notif.title,
          message: notif.message,
          duration: 8000,
        })
      }
    })

    // Subscribe to comments on user's tasks
    const commentsChannel = subscribe(`comments:${userId}`, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      
      if (payload.new) {
        addToast({
          type: 'info',
          title: 'New Comment',
          message: `${payload.new.content.substring(0, 50)}...`,
        })
      }
    })

    return () => {
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(kpiChannel)
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(commentsChannel)
    }
  }, [user, supabase, subscribe, addToast, queryClient])

  return <>{children}</>
}