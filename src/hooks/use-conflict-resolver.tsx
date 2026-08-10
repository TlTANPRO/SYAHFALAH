// src/hooks/use-conflict-resolver.tsx
// Combined hook + provider for handling save conflicts.
// Wraps ConflictResolutionDialog + InlineEdit onConflict wiring.
// Usage:
//   const { ConflictProvider, handleConflict } = useConflictResolver()
//   <ConflictProvider />
//   <InlineEdit onConflict={handleConflict({ table, baseRow, save })} />

'use client'

import * as React from 'react'
import { create } from 'zustand'
import { ConflictResolutionDialog, type ConflictField } from '@/components/ui/conflict-resolution-dialog'
import { diffRows, type RowData } from './use-conflict-aware-edit'

interface ConflictState {
  open: boolean
  rowLabel: string
  fields: ConflictField[]
  onResolve: ((resolution: 'accept-theirs' | 'keep-mine' | 'merge', merged?: Record<string, unknown>) => void) | null
}

interface ConflictStore extends ConflictState {
  show: (info: { rowLabel: string; fields: ConflictField[]; onResolve: ConflictState['onResolve'] }) => void
  close: () => void
}

const useConflictStore = create<ConflictStore>((set) => ({
  open: false,
  rowLabel: '',
  fields: [],
  onResolve: null,
  show: (info) => set({
    open: true,
    rowLabel: info.rowLabel,
    fields: info.fields,
    onResolve: info.onResolve,
  }),
  close: () => set({ open: false }),
}))

export function useConflictResolver() {
  const show = useConflictStore((s) => s.show)
  const close = useConflictStore((s) => s.close)
  
  /**
   * Build a conflict handler to pass to InlineEdit.onConflict.
   * Returns Promise<boolean>: true if save should proceed, false if cancelled.
   */
  const handleConflict = React.useCallback(
    <T extends RowData>(opts: {
      table: string
      rowLabel?: string
      baseRow: T | null
      save: (values: Partial<T>) => Promise<void>
      /** Field names to check for conflicts (defaults to all changed fields) */
      conflictFields?: string[]
    }) => {
      return async (info: {
        serverRow: Record<string, unknown>
        baseRow: Record<string, unknown> | null
        draft: string | number
      }): Promise<boolean> => {
        // Build conflict fields
        const baseRow = (opts.baseRow ?? info.baseRow) as Partial<RowData> | null
        if (!baseRow) return true // No baseline, proceed
        
        // Diff between baseRow and serverRow = their changes
        const theirChanges = diffRows(baseRow as RowData, info.serverRow as RowData)
        
        // Find which fields differ
        const conflictingFields: ConflictField[] = []
        for (const change of theirChanges) {
          // Skip auto-managed fields
          if (['id', 'created_at', 'updated_at'].includes(change.field)) continue
          
          const mine = info.draft !== undefined ? info.draft : baseRow[change.field as keyof typeof baseRow]
          const theirs = change.to
          
          // If my draft differs from both base AND theirs → conflict
          if (mine !== undefined && String(mine) !== String(baseRow[change.field as keyof typeof baseRow])) {
            conflictingFields.push({
              name: change.field,
              mine,
              theirs,
              base: change.from,
            })
          }
        }
        
        if (conflictingFields.length === 0) {
          return true // No actual conflict on overlapping fields
        }
        
        // Show dialog and wait for resolution
        return new Promise<boolean>((resolve) => {
          show({
            rowLabel: opts.rowLabel ?? opts.table,
            fields: conflictingFields,
            onResolve: (resolution, merged) => {
              close()
              if (resolution === 'accept-theirs') {
                resolve(false) // Discard my changes
                return
              }
              if (resolution === 'keep-mine') {
                resolve(true) // Proceed with my original draft
                return
              }
              // Merge: apply user's per-field choices
              if (merged) {
                // Save merged values instead of original draft
                opts.save(merged as Partial<T>).then(() => resolve(true))
              } else {
                resolve(true)
              }
            },
          })
        })
      }
    },
    [show, close]
  )
  
  return { handleConflict, close }
}

/**
 * Provider component — render once at app/page level.
 * Mounts the ConflictResolutionDialog.
 */
export function ConflictProvider() {
  const { open, rowLabel, fields, onResolve, close } = useConflictStore()
  
  if (!onResolve) return null
  
  return (
    <ConflictResolutionDialog
      open={open}
      onClose={close}
      rowLabel={rowLabel}
      conflictingFields={fields}
      onResolve={(resolution, merged) => onResolve(resolution, merged)}
    />
  )
}
