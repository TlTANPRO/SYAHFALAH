// components/ui/live-indicator.tsx
// Tiny pill showing realtime connection status.
// Uses getRealtimeStatus() exported from use-live-table to check active subscriptions.

'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { getRealtimeStatus } from '@/lib/hooks/use-live-table'

type Status = 'connecting' | 'connected' | 'disconnected'

/**
 * Polls the realtime subscription registry every 3s and reports
 * the aggregate connection state.
 */
export function useRealtimeStatus(): Status {
  const [status, setStatus] = useState<Status>('disconnected')

  useEffect(() => {
    const tick = () => setStatus(getRealtimeStatus())
    tick()
    const interval = setInterval(tick, 3000)
    return () => clearInterval(interval)
  }, [])

  return status
}

export function LiveIndicator() {
  const status = useRealtimeStatus()

  const config = {
    connecting: {
      dot: 'bg-[var(--color-warning)] animate-pulse',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: 'Menyambungkan',
      ariaLabel: 'Realtime sedang menyambungkan',
    },
    connected: {
      dot: 'bg-[var(--color-verdigris-500)]',
      icon: <Wifi className="h-3 w-3" />,
      label: 'Live',
      ariaLabel: 'Live update aktif — perubahan dari user lain akan tampil otomatis',
    },
    disconnected: {
      dot: 'bg-[var(--color-text-tertiary)]',
      icon: <WifiOff className="h-3 w-3" />,
      label: 'Offline',
      ariaLabel: 'Realtime terputus, refresh halaman untuk menyambungkan ulang',
    },
  }[status]

  return (
    <div
      role="status"
      aria-label={config.ariaLabel}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]"
      title={config.ariaLabel}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  )
}
