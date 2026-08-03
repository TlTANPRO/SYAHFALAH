// providers/SupabaseProvider.tsx
// Supabase Realtime provider

'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface SupabaseContextType {
  supabase: ReturnType<typeof createClient>
  subscribe: (channel: string, callback: (payload: any) => void) => RealtimeChannel
  unsubscribe: (channel: RealtimeChannel) => void
}

const SupabaseContext = createContext<SupabaseContextType | null>(null)

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [channels, setChannels] = useState<Map<string, RealtimeChannel>>(new Map())

  const subscribe = (channelName: string, callback: (payload: any) => void) => {
    const channel = supabase.channel(channelName)
    channel
      .on('broadcast', { event: '*' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public' }, callback)
      .subscribe()

    setChannels((prev) => new Map(prev).set(channelName, channel))
    return channel
  }

  const unsubscribe = (channel: RealtimeChannel) => {
    supabase.removeChannel(channel)
    setChannels((prev) => {
      const next = new Map(prev)
      for (const [key, ch] of next.entries()) {
        if (ch === channel) {
          next.delete(key)
          break
        }
      }
      return next
    })
  }

  useEffect(() => {
    return () => {
      // Cleanup all channels on unmount
      channels.forEach((channel) => {
        supabase.removeChannel(channel)
      })
    }
  }, [channels, supabase])

  return (
    <SupabaseContext.Provider value={{ supabase, subscribe, unsubscribe }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}