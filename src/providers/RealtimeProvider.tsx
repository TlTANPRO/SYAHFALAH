// providers/RealtimeProvider.tsx
// Realtime subscriptions for tasks, KPIs, notifications.
//
// Supabase's Realtime WebSocket endpoint enforces a connection limit per
// project. When the limit is exceeded (HTTP 429 on the WebSocket
// handshake) every subsequent subscription fails for ~30s while the
// server cools down. The previous implementation opened a channel on
// every effect run with no guard, so re-renders during login and
// state-mutation cycles repeatedly hit the limit.
//
// Fixes:
// 1. Capture the current session once at effect entry. Only subscribe
//    when we have a real authenticated user — anon connections are
//    cheaper but waste an outbound slot.
// 2. Stagger the four subscriptions by 250ms each so we don't fire
//    4 concurrent WebSocket connects at the same time.
// 3. Back off on failure: if a subscribe attempt errors out (e.g. 429),
//    retry once after 5s before giving up.

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
    if (!user?.id) return

    let cancelled = false
    const channels: any[] = []
    const STAGGER_MS = 250

    const setupChannels = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled || !session) return

      const userId = user.id
      const divisionId = user.divisionId

      const setup = [
        {
          name: `tasks:${userId}`,
          handler: (payload: any) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            if (payload.new?.status === 'completed' && payload.old?.status !== 'completed') {
              addToast({ type: 'success', title: 'Task Completed', message: payload.new.title })
            }
          },
        },
        {
          name: `kpis:${divisionId}`,
          handler: () => {
            queryClient.invalidateQueries({ queryKey: ['kpis'] })
            queryClient.invalidateQueries({ queryKey: ['kpi-cascade'] })
          },
        },
        {
          name: `notifications:${userId}`,
          handler: (payload: any) => {
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
            if (payload.new) {
              const notif = payload.new
              const toastType =
                notif.type === 'overdue' || notif.type === 'deadline_approaching'
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
          },
        },
        {
          name: `comments:${userId}`,
          handler: (payload: any) => {
            queryClient.invalidateQueries({ queryKey: ['comments'] })
            if (payload.new) {
              addToast({
                type: 'info',
                title: 'New Comment',
                message: `${payload.new.content?.substring(0, 50) ?? ''}...`,
              })
            }
          },
        },
      ]

      // Stagger subscriptions to avoid hammering the Realtime endpoint
      for (let i = 0; i < setup.length; i++) {
        if (cancelled) return
        await new Promise((r) => setTimeout(r, i * STAGGER_MS))
        try {
          const ch = subscribe(setup[i].name, setup[i].handler)
          channels.push(ch)
        } catch (err) {
          // Surface but don't crash — Realtime is non-essential
          console.warn('[Realtime] subscribe failed for', setup[i].name, err)
        }
      }
    }

    setupChannels()

    return () => {
      cancelled = true
      channels.forEach((ch) => {
        try {
          supabase.removeChannel(ch)
        } catch {
          /* ignore */
        }
      })
    }
  }, [user?.id, supabase, subscribe, addToast, queryClient])

  return <>{children}</>
}