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
      className="fixed bottom-20 right-4 z-50 max-w-sm rounded-lg border border-[surface-4] bg-white p-4 shadow-xl dark:border-[border-strong] dark:bg-[text-primary]"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-[text-primary] p-2 text-white dark:bg-[surface-3] dark:text-[text-primary]">
          <Download className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Pasang Syahfalah di HP</h3>
          <p className="text-xs text-[text-secondary] dark:text-text-secondary mt-0.5">
            Akses lebih cepat, bisa offline saat survey lapangan.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={accept}
              className="rounded-md bg-[text-primary] px-3 py-1.5 text-xs font-medium text-white hover:bg-[text-tertiary] dark:bg-[surface-3] dark:text-[text-primary] dark:hover:bg-[surface-4]"
            >
              Pasang
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-md border border-[surface-4] px-3 py-1.5 text-xs hover:bg-[surface-3] dark:border-[border-strong] dark:hover:bg-[text-primary]"
              aria-label="Dismiss install prompt"
            >
              Nanti
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          className="-m-1 rounded-md p-1 text-[text-tertiary] hover:bg-[surface-3] dark:hover:bg-[text-primary]"
          aria-label="Close install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
