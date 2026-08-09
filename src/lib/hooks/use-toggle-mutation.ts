// lib/hooks/use-toggle-mutation.ts
// Optimistic toggle mutation for boolean preferences.
// Pattern: useQuery for read + useMutation for write + auto-rollback on error.
// Live sync: queryClient.invalidateQueries on success lets RealtimeProvider
// pick up the change and broadcast to other sessions.

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface ToggleVars {
  key: string
  value: boolean
  [key: string]: unknown
}

interface UseToggleOptions {
  url: string
  invalidate?: Array<readonly unknown[]>
}

export function useToggleMutation({
  url,
  invalidate = [],
}: UseToggleOptions) {
  const queryClient = useQueryClient()

  return useMutation<unknown, Error, ToggleVars, { snapshots: Array<[readonly unknown[], unknown]> }>({
    mutationFn: async (vars) => {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(vars),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      return res.json()
    },
    onMutate: async (vars) => {
      const { key, value } = vars
      const snapshots: Array<[readonly unknown[], unknown]> = []
      for (const qk of invalidate) {
        await queryClient.cancelQueries({ queryKey: qk })
        const prev = queryClient.getQueryData(qk)
        snapshots.push([qk, prev])
        if (prev && typeof prev === 'object') {
          queryClient.setQueryData(qk, (old: any) => {
            if (!old) return old
            if (Array.isArray(old)) {
              return old.map((item: any) =>
                item && typeof item === 'object' && 'key' in item && item.key === key
                  ? { ...item, value }
                  : item
              )
            }
            if (key in old) {
              return { ...old, [key]: value }
            }
            return old
          })
        }
      }
      return { snapshots }
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshots) {
        for (const [qk, prev] of context.snapshots) {
          queryClient.setQueryData(qk, prev)
        }
      }
    },
    onSuccess: () => {
      for (const qk of invalidate) {
        queryClient.invalidateQueries({ queryKey: qk })
      }
    },
  })
}
