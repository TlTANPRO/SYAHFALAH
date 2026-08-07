'use client'
// src/components/PWAInstallPrompt.tsx
// Plan C Phase 4 — PWA install prompt. Captures the `beforeinstallprompt`
// event, shows a chip in the corner asking to install as a native app.
// Dismissable; remembers dismissal in localStorage so we don't nag.

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const DISMISS_KEY = 'syahfalah.pwa.dismissed'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export function PWAInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState<boolean>(true) // start true so we don't flash

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1')
    const onPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setEvent(e)
    }
    window.addEventListener('beforeinstallprompt', onPrompt as EventListener)
    const onInstalled = () => {
      setEvent(null)
      window.localStorage.setItem(DISMISS_KEY, '1')
      setDismissed(true)
    }
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt as EventListener)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!event || dismissed) return null

  const accept = async () => {
    try {
      await event.prompt()
      const choice = await event.userChoice
      if (choice.outcome === 'dismissed') {
        window.localStorage.setItem(DISMISS_KEY, '1')
        setDismissed(true)
      } else {
        // accepted → browser shows its own install dialog, then appinstalled fires.
        setEvent(null)
      }
    } catch {
      setEvent(null)
    }
  }

  const close = () => {
    window.localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div
      role="dialog"
      aria-label="Install Syahfalah app"
      className="fixed bottom-20 right-4 z-50 max-w-sm rounded-lg border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-zinc-900 p-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
          <Download className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Pasang Syahfalah di HP</h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Akses lebih cepat, bisa offline saat survey lapangan.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={accept}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Pasang
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
              aria-label="Dismiss install prompt"
            >
              Nanti
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          className="-m-1 rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          aria-label="Close install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
