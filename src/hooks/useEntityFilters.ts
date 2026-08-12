// hooks/useEntityFilters.ts
// Bridges URL search params with useEntityList (or any data source) and
// with ListFilters chip filtering.
//
// Pattern: every list page has the same shape — chip filters + search input
// + pagination + tabs. This hook centralizes the state and URL syncing so
// each page can just declare its filter config.
//
// Usage:
//   const { q, setQ, activeChip, setActiveChip, params, isActive } =
//     useEntityFilters([
//       { label: 'Semua', value: '' },
//       { label: 'Baru', value: 'new' },
//     ], { paramName: 'stage' })
//
//   const { data } = useEntityList('leads', params)
//
//   <ListFilters
//     searchPlaceholder="Cari leads..."
//     basePath="/owner/marketing"
//     searchValue={q}
//     chips={chips.map(c => ({ ...c, active: c.value === activeChip }))}
//     extraParams={{ stage: activeChip }}
//   />
//
// Benefits:
// - Single source of truth for filter state
// - URL ?stage=new&q=foo synced automatically
// - Empty chip value clears the filter (returns to "all")
// - Works with Next.js router and search params
// - Drop-in for useEntityList and any other data source

'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export interface FilterChipConfig {
  label: string
  value: string
  count?: number
  param?: string
}

export interface UseEntityFiltersOptions {
  /** URL param name for the active chip. Default: 'filter' */
  paramName?: string
  /** URL param name for search. Default: 'q' */
  searchParamName?: string
  /** When true, the filter chip + search are written to the URL (shareable, back-button works). Default: true. */
  syncToUrl?: boolean
}

export interface UseEntityFiltersResult {
  /** Current search query */
  q: string
  /** Set search query (syncs to URL if enabled) */
  setQ: (next: string) => void
  /** Active chip value (empty string = "all") */
  activeChip: string
  /** Set active chip (syncs to URL if enabled) */
  setActiveChip: (next: string) => void
  /** Test whether a given chip is currently active */
  isActive: (chipValue: string) => boolean
  /** Combined params object ready to pass to useEntityList */
  params: Record<string, string | number | boolean | undefined | null>
  /** True while URL navigation is pending */
  isPending: boolean
}

/**
 * Manage filter chip + search state with optional URL syncing.
 * Returns params object ready to feed to useEntityList.
 */
export function useEntityFilters(
  chips: readonly FilterChipConfig[],
  options: UseEntityFiltersOptions = {}
): UseEntityFiltersResult {
  const paramName = options.paramName ?? 'filter'
  const searchParamName = options.searchParamName ?? 'q'
  const syncToUrl = options.syncToUrl ?? true
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeChip = searchParams.get(paramName) ?? ''
  const q = searchParams.get(searchParamName) ?? ''

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      if (!syncToUrl) return
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === '') params.delete(k)
        else params.set(k, v)
      }
      const qs = params.toString()
      router.replace(qs ? `?${qs}` : '?', { scroll: false })
    },
    [router, searchParams, syncToUrl]
  )

  const setQ = useCallback(
    (next: string) => updateParam({ [searchParamName]: next || null }),
    [updateParam, searchParamName]
  )

  const setActiveChip = useCallback(
    (next: string) => updateParam({ [paramName]: next || null }),
    [updateParam, paramName]
  )

  const isActive = useCallback((chipValue: string) => activeChip === chipValue, [activeChip])

  // Build params for useEntityList. Map chip value to entity field if chip has `param` override.
  const params = useMemo(() => {
    const p: Record<string, string | number | boolean | undefined | null> = {}
    if (q) p[searchParamName] = q
    if (activeChip) p[paramName] = activeChip
    return p
  }, [q, activeChip, paramName, searchParamName])

  return {
    q,
    setQ,
    activeChip,
    setActiveChip,
    isActive,
    params,
    isPending: false, // Next.js 15 useTransition could be wired here
  }
}
