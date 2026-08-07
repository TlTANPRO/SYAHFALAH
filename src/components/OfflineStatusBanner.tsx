'use client'
// src/components/OfflineStatusBanner.tsx
// Plan C Phase 4 — Shows a small banner + a count of pending sync
// mutations whenever the browser is offline. Drains the queue the
// moment the connection returns.

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, RotateCw } from 'lucide-react'
import { attachAutoSync, drainQueue, queueSize } from '@/lib/offline/sync-queue'

export function OfflineStatusBanner() {
  const [online, setOnline] = useState<boolean>(true)
  const [queueDepth, setQueueDepth] = useState<number>(0)
  const [busy, setBusy] = useState<boolean>(false)
  const [lastResult, setLastResult] = useState<{ applied: number; failed: number; duplicates: number } | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)

    const refresh = () => { void queueSize().then(setQueueDepth) }
    refresh()

    const onOnline = () => { setOnline(true); refresh() }
    const onOffline = () => setOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    const stop = attachAutoSync((res) => {
      setLastResult(res)
      refresh()
    })

    // Periodic refresh while we have unsynced items.
    const handle = window.setInterval(() => {
      refresh()
    }, 5000)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      stop()
      window.clearInterval(handle)
    }
  }, [])

  if (online && queueDepth === 0) {
    return null
  }

  const manualDrain = async () => {
    setBusy(true)
    try {
      const res = await drainQueue()
      setLastResult(res)
      setQueueDepth(0)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92vw] rounded-lg border bg-zinc-950/90 backdrop-blur px-4 py-3 text-white shadow-lg flex items-center gap-3"
    >
      {online ? <Wifi className="h-5 w-5 text-emerald-400" /> : <WifiOff className="h-5 w-5 text-rose-400" />}
      <div className="flex-1 text-xs leading-tight">
        {online ? (
          <>
            <div className="font-semibold">Online — syncing queued operations</div>
            {queueDepth > 0 ? (
              <div className="text-zinc-300">
                {queueDepth} pending. {lastResult && `${lastResult.applied} applied, ${lastResult.failed} failed, ${lastResult.duplicates} duplicates`}
              </div>
            ) : lastResult ? (
              <div className="text-zinc-300">Last sync: {lastResult.applied} applied, {lastResult.failed} failed</div>
            ) : null}
          </>
        ) : (
          <>
            <div className="font-semibold">Offline — mutations saved locally</div>
            {queueDepth > 0 ? (
              <div className="text-zinc-300">
                {queueDepth} queued. Will sync automatically when you're back online.
              </div>
            ) : (
              <div className="text-zinc-300">You can still browse cached pages.</div>
            )}
          </>
        )}
      </div>
      {queueDepth > 0 && online && (
        <button
          type="button"
          aria-label="Sync queued operations now"
          onClick={manualDrain}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 disabled:opacity-50"
        >
          <RotateCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
          Sync now
        </button>
      )}
    </div>
  )
}
