// src/hooks/use-conflict-aware-edit.ts
// Detects when a row was modified by someone else between fetch and save.
// Shows a non-blocking toast with the diff and lets user choose:
// - Accept their change (revert mine)
// - Overwrite (keep mine, log to audit)
// - Merge field-by-field

'use client'

import * as React from 'react'
import { useUIStore } from '@/stores/uiStore'

export interface RowData extends Record<string, unknown> {
  id: string
  updated_at?: string
}

export type ConflictResolution = 'accept-theirs' | 'keep-mine' | 'merge'

interface ConflictInfo<T extends RowData> {
  /** The version we tried to save (with my changes) */
  mine: Partial<T>
  /** The current server version (with their changes) */
  theirs: T
  /** The original version we loaded (the baseline) */
  base: Partial<T>
  /** Fields that differ between mine and theirs */
  conflictingFields: string[]
  /** Resolve callback */
  resolve: (resolution: ConflictResolution, merged?: Partial<T>) => void
}

interface Options<T extends RowData> {
  /** Table name (for re-fetch label) */
  table?: string
  /** Display name of row (e.g., user name, project name) */
  rowLabel?: string
  /** Current row from server */
  serverRow: T | null | undefined
  /** My pending changes */
  myChanges: Partial<T>
  /** Original baseline (when user opened edit) */
  baseRow: Partial<T> | null
  /** Save handler — receives merged values */
  onSave: (values: Partial<T>) => Promise<void>
}

export function useConflictAwareEdit<T extends RowData>({
  table,
  rowLabel,
  serverRow,
  myChanges,
  baseRow,
  onSave,
}: Options<T>) {
  const addToast = useUIStore((s) => s.addToast)
  const [conflict, setConflict] = React.useState<ConflictInfo<T> | null>(null)
  
  const detectConflict = React.useCallback(async (): Promise<ConflictInfo<T> | null> => {
    if (!serverRow || !baseRow) return null
    
    // If serverRow's updated_at hasn't changed since base, no conflict
    if (serverRow.updated_at && baseRow.updated_at === serverRow.updated_at) {
      return null
    }
    
    // Find fields that differ between serverRow and baseRow (their changes)
    const theirChanges: Partial<T> = {}
    for (const key of Object.keys(serverRow)) {
      if (JSON.stringify(serverRow[key]) !== JSON.stringify(baseRow[key as keyof T])) {
        (theirChanges as Record<string, unknown>)[key] = serverRow[key]
      }
    }
    
    // Find fields that differ between myChanges and baseRow (my changes)
    const myChangedFields = new Set<string>()
    for (const key of Object.keys(myChanges)) {
      if (JSON.stringify(myChanges[key as keyof T]) !== JSON.stringify(baseRow[key as keyof T])) {
        myChangedFields.add(key)
      }
    }
    
    // Conflict = both sides changed the same fields
    const conflictingFields: string[] = []
    for (const field of myChangedFields) {
      if (field in theirChanges) {
        conflictingFields.push(field)
      }
    }
    
    if (conflictingFields.length === 0) {
      // No field-level conflict — server change doesn't overlap with mine
      return null
    }
    
    return {
      mine: myChanges,
      theirs: serverRow,
      base: baseRow,
      conflictingFields,
      resolve: (resolution, merged) => {
        let finalValues: Partial<T>
        if (resolution === 'accept-theirs') {
          // Discard my changes (no save)
          finalValues = {}
        } else if (resolution === 'keep-mine') {
          // Save with my values, overwriting theirs
          finalValues = myChanges
        } else {
          // Merge: use merged values or fallback to mine
          finalValues = merged ?? myChanges
        }
        
        if (Object.keys(finalValues).length > 0) {
          onSave(finalValues).then(() => {
            setConflict(null)
          })
        } else {
          setConflict(null)
        }
      },
    }
  }, [serverRow, baseRow, myChanges, onSave])
  
  const showConflictToast = React.useCallback((info: ConflictInfo<T>) => {
    setConflict(info)
    
    // Build field list for toast message
    const fieldList = info.conflictingFields.slice(0, 3).join(', ') +
      (info.conflictingFields.length > 3 ? ` +${info.conflictingFields.length - 3}` : '')
    
    addToast({
      title: '⚠️ Row diubah orang lain',
      message: `${rowLabel ?? 'Baris'} — field konflik: ${fieldList}. Klik untuk lihat detail.`,
      type: 'warning',
      duration: 10000,
      action: {
        label: 'Lihat',
        onClick: () => {
          // Trigger the conflict dialog (handled by parent)
        },
      },
    })
  }, [addToast, rowLabel])
  
  return {
    conflict,
    detectConflict,
    showConflictToast,
    dismissConflict: () => setConflict(null),
  }
}

// Helper: compare two rows and return field-level diff
export function diffRows<T extends Record<string, unknown>>(base: T, current: T): Array<{ field: string; from: unknown; to: unknown }> {
  const changes: Array<{ field: string; from: unknown; to: unknown }> = []
  const keys = new Set([...Object.keys(base), ...Object.keys(current)])
  for (const key of keys) {
    if (['id', 'created_at'].includes(key)) continue
    if (JSON.stringify(base[key]) !== JSON.stringify(current[key])) {
      changes.push({ field: key, from: base[key], to: current[key] })
    }
  }
  return changes
}
