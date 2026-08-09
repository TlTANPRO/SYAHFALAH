// lib/hooks/use-live-table.ts
// Subscribe to a specific table's changes via Supabase Realtime.
// On any INSERT/UPDATE/DELETE event for that table, invalidate the matching
// TanStack Query keys so the UI refetches fresh data.
//
// Usage:
//   useLiveTable('tasks', [['tasks'], ['my-tasks']])
//   useLiveTable('notifications', [['notifications', userId]])
//
// Multiple subscriptions to the same table are deduplicated via a module-level
// counter — only one WebSocket channel is opened per table per page.

'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/providers/SupabaseProvider'

interface UseLiveTableOptions {
  /** Table name in public schema (e.g. 'tasks', 'notifications') */
  table: string
  /** Query keys to invalidate when this table changes */
  invalidate: Array<readonly unknown[]>
  /** Optional filter (RLS-aware) — e.g. { user_id: currentUserId } */
  filter?: Record<string, string | number>
  /** Optional: extra handler after invalidation */
  onChange?: (payload: { eventType: string; new: any; old: any }) => void
  /** Enable/disable subscription (default true) */
  enabled?: boolean
}

// Module-level registry to dedupe channels
const registry = new Map<
  string,
  {
    refCount: number
    channel: any
    handlers: Set<(payload: any) => void>
    cleanup: () => void
  }
>()

function getOrCreateSubscription(
  supabase: any,
  table: string,
  filter: Record<string, string | number> | undefined,
): {
  refCount: number
  channel: any
  handlers: Set<(payload: any) => void>
  cleanup: () => void
} {
  const key = filter ? `${table}:${JSON.stringify(filter)}` : table
  const existing = registry.get(key)
  if (existing) return existing

  const handlers = new Set<(payload: any) => void>()
  const channelConfig: any = { event: '*', schema: 'public', table }
  if (filter) channelConfig.filter = filter

  const channel = supabase
    .channel(`live:${key}`)
    .on('postgres_changes', channelConfig, (payload: any) => {
      handlers.forEach((h) => h(payload))
    })
    .subscribe((status: string) => {
      // status: SUBSCRIBED | CHANNEL_ERROR | TIMEOUT | CLOSED
      // expose via window for LiveIndicator
      const w = window as any
      w.__syahfalahRealtimeStatus = status === 'SUBSCRIBED' ? 'connected' : 'disconnected'
    })

  const cleanup = () => {
    supabase.removeChannel(channel)
    registry.delete(key)
    const w = window as any
    if (registry.size === 0) w.__syahfalahRealtimeStatus = 'disconnected'
  }

  const entry = { refCount: 0, channel, handlers, cleanup }
  registry.set(key, entry)
  return entry
}

/**
 * Aggregate realtime status — 'connected' if any subscription is active.
 * Returns 'disconnected' when no channels or all failed.
 */
export function getRealtimeStatus(): 'connecting' | 'connected' | 'disconnected' {
  if (typeof window === 'undefined') return 'disconnected'
  if (registry.size === 0) return 'disconnected'
  const subscribed = [...registry.values()].some((e: any) => e.channel?.state === 'joined')
  if (subscribed) return 'connected'
  return 'connecting'
}

export function useLiveTable({
  table,
  invalidate = [],
  filter,
  onChange,
  enabled = true,
}: UseLiveTableOptions) {
  const { supabase } = useSupabase()
  const queryClient = useQueryClient()
  const invalidateRef = useRef(invalidate)
  invalidateRef.current = invalidate
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!enabled) return

    const entry = getOrCreateSubscription(supabase, table, filter)
    entry.refCount += 1

    const handler = (payload: any) => {
      // Invalidate matching queries
      for (const qk of invalidateRef.current) {
        queryClient.invalidateQueries({ queryKey: qk })
      }
      // Fire optional user callback
      onChangeRef.current?.({
        eventType: payload.eventType,
        new: payload.new,
        old: payload.old,
      })
    }

    entry.handlers.add(handler)

    return () => {
      entry.handlers.delete(handler)
      entry.refCount -= 1
      // Keep channel alive for ~5s after last unsubscribe so quick remounts don't flap
      if (entry.refCount <= 0) {
        setTimeout(() => {
          const fresh = registry.get(filter ? `${table}:${JSON.stringify(filter)}` : table)
          if (fresh && fresh.refCount <= 0) {
            fresh.cleanup()
          }
        }, 5_000)
      }
    }
  }, [supabase, table, JSON.stringify(filter ?? {}), enabled])
}
