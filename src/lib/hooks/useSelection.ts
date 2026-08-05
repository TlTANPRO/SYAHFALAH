// lib/hooks/useSelection.ts
// Generic set-based row selection. Identifies rows via getId() so any
// shape works (code, uuid, custom id, etc).

'use client'

import { useCallback, useMemo, useState } from 'react'

export function useSelection<T>(
  rows: T[],
  getId: (row: T) => string | number
) {
  const [selected, setSelected] = useState<Set<string | number>>(new Set())

  const toggle = useCallback(
    (id: string | number) => {
      setSelected(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    []
  )

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      if (prev.size === rows.length) return new Set()
      return new Set(rows.map(getId))
    })
  }, [rows, getId])

  const clear = useCallback(() => setSelected(new Set()), [])

  const isAllSelected = useMemo(
    () => rows.length > 0 && selected.size === rows.length,
    [rows.length, selected.size]
  )

  const selectedRows = useMemo(
    () => rows.filter(r => selected.has(getId(r))),
    [rows, selected, getId]
  )

  return {
    selected,
    selectedIds: Array.from(selected),
    selectedRows,
    toggle,
    toggleAll,
    clear,
    isAllSelected,
    count: selected.size,
  }
}