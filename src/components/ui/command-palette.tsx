// components/ui/command-palette.tsx
// Cmd+K launcher. The keyboard listener has to be installed
// unconditionally (regardless of `open` state) so the user can
// press ⌘K to open the dialog. The previous version only
// attached the listener inside the `if (!open) return null`
// branch, which meant the first Cmd+K was always swallowed.

'use client'

import { useEffect } from 'react'
import { CommandPalette } from './command'

interface CommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandDialog({ open, onOpenChange }: CommandDialogProps) {
  // Always-on listener. Captures `open` via closure but doesn't
  // depend on it — the user must be able to press ⌘K even when
  // the dialog is closed. Use the capture phase so the event
  // reaches us before the focused <input> swallows Ctrl/Cmd+K
  // (Chrome tries to focus the address bar on Ctrl+K, which
  // preventDefault stops).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        e.stopPropagation()
        onOpenChange(!open)
      } else if (e.key === 'Escape' && open) {
        e.preventDefault()
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true } as EventListenerOptions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-popover shadow-2xl overflow-hidden">
        <CommandPalette open={open} onOpenChange={onOpenChange} />
      </div>
    </div>
  )
}
