// src/hooks/use-undo-toast.ts
// Show toast with undo button that reverts the change.

'use client'

import * as React from 'react'
import { useUIStore } from '@/stores/uiStore'

interface UndoOptions {
  /** Toast title shown to user */
  title: string
  /** Detailed message */
  message?: string
  /** Duration in ms before undo expires (default 5000) */
  duration?: number
  /** Function to revert the change */
  onUndo: () => Promise<void> | void
}

export function useUndoToast() {
  const addToast = useUIStore((s) => s.addToast)
  const removeToast = useUIStore((s) => s.removeToast)
  const updateToast = useUIStore((s) => s.updateToast)

  return React.useCallback(
    ({ title, message, duration = 5000, onUndo }: UndoOptions) => {
      // Add toast with undo action (addToast auto-generates id)
      const toastId = addToast({
        title,
        message: message ? `${message} · Undo?` : 'Undo?',
        type: 'success',
        duration,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await onUndo()
              updateToast(toastId, { title: 'Dibatalkan', type: 'info' })
            } catch (e) {
              updateToast(toastId, {
                title: 'Undo gagal',
                message: e instanceof Error ? e.message : 'Error',
                type: 'destructive',
              })
            }
          },
        },
      })
      
      return toastId
    },
    [addToast, removeToast, updateToast]
  )
}
