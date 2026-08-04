// components/ui/command-palette.tsx
// Cmd+K launcher. Wraps the CommandPalette from command.tsx in a
// modal dialog and adds a global keyboard listener so pressing
// ⌘K / Ctrl-K anywhere on a dashboard page opens the palette.

'use client'

import { useEffect } from 'react'
import { CommandPalette } from './command'

interface CommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandDialog({ open, onOpenChange }: CommandDialogProps) {
  // Global ⌘K / Ctrl-K listener. Avoids duplicating the same handler
  // in every page that mounts the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

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
