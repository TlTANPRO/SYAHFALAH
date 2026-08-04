// components/auth/SessionExpiryBanner.tsx
// Shows a tiny banner when the access token is about to expire, with a
// "Refresh" button. Mounted once in the dashboard layout.

'use client'

import { useTransition } from 'react'
import { Clock, RefreshCcw } from 'lucide-react'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'
import { useUIStore } from '@/stores/uiStore'

export function SessionExpiryBanner() {
  const { isExpiringSoon, minutesLeft } = useSessionTimeout(2)
  const { addToast } = useUIStore()
  const [isPending, startTransition] = useTransition()

  if (!isExpiringSoon) return null

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' })
        if (res.ok) {
          addToast({ type: 'success', title: 'Session diperpanjang' })
        } else {
          addToast({ type: 'destructive', title: 'Session habis, silakan login ulang' })
        }
      } catch {
        addToast({ type: 'destructive', title: 'Gagal menghubungi server' })
      }
    })
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 shadow-lg backdrop-blur">
      <div className="flex items-start gap-3">
        <Clock className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Session akan berakhir dalam {minutesLeft ?? '<1'} menit
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Simpan pekerjaan Anda dan refresh session.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-warning/20 px-2 py-1 text-xs font-medium text-warning hover:bg-warning/30 transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`h-3 w-3 ${isPending ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  )
}
