// src/hooks/use-selectable-rows.ts
// Manages row selection state with a "select all" toggle.
// Listens for 'bulk-deselect-all' window event from BulkActionBar.

'use client'

import * as React from 'react'

export function useSelectableRows(rowIds: string[]) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  // Listen for global deselect event
  React.useEffect(() => {
    const handler = () => setSelected(new Set())
    window.addEventListener('bulk-deselect-all', handler)
    return () => window.removeEventListener('bulk-deselect-all', handler)
  }, [])

  const toggle = React.useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = React.useCallback(() => {
    setSelected((prev) => {
      if (prev.size === rowIds.length) {
        return new Set() // clear all
      }
      return new Set(rowIds)
    })
  }, [rowIds])

  const clear = React.useCallback(() => {
    setSelected(new Set())
  }, [])

  const allSelected = rowIds.length > 0 && selected.size === rowIds.length
  const someSelected = selected.size > 0 && selected.size < rowIds.length

  return {
    selected,
    selectedIds: Array.from(selected),
    selectedCount: selected.size,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
    isSelected: (id: string) => selected.has(id),
  }
}
