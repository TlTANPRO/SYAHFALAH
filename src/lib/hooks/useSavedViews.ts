// lib/hooks/useSavedViews.ts
// Lightweight saved-views system. Stores arbitrary serialized state
// (filter values, sort, search) in localStorage keyed by route. No DB
// dependency — survives page reload, cleared by "Reset all" button.
//
// Usage:
//   const views = useSavedViews('kpi-explorer')
//   <SavedViewsBar views={views} current={filters} onApply={(v) => setFilters(v)} />

'use client'

import { useCallback, useEffect, useState } from 'react'

export interface SavedView {
  id: string
  label: string
  state: Record<string, unknown>
  createdAt: number
}

const STORAGE_PREFIX = 'syahfalah:savedview:'

function storageKey(scope: string): string {
  return `${STORAGE_PREFIX}${scope}`
}

function readViews(scope: string): SavedView[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storageKey(scope))
    if (!raw) return []
    return JSON.parse(raw) as SavedView[]
  } catch {
    return []
  }
}

function writeViews(scope: string, views: SavedView[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify(views))
  } catch {
    // quota exceeded or storage disabled — silently skip
  }
}

export function useSavedViews(scope: string) {
  const [views, setViews] = useState<SavedView[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setViews(readViews(scope))
    setHydrated(true)
  }, [scope])

  const save = useCallback(
    (label: string, state: Record<string, unknown>) => {
      const entry: SavedView = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: label.trim() || `View ${views.length + 1}`,
        state,
        createdAt: Date.now(),
      }
      const next = [...views, entry]
      setViews(next)
      writeViews(scope, next)
      return entry.id
    },
    [scope, views]
  )

  const remove = useCallback(
    (id: string) => {
      const next = views.filter(v => v.id !== id)
      setViews(next)
      writeViews(scope, next)
    },
    [scope, views]
  )

  const clear = useCallback(() => {
    setViews([])
    writeViews(scope, [])
  }, [scope])

  return { views, save, remove, clear, hydrated }
}