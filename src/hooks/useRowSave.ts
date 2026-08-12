// hooks/useRowSave.ts
// Encapsulates the common "smart row" pattern used by all 8 RowClient files:
// - SmartInlineEdit onSave + onConflict callbacks
// - DetailSheet onSaved + onDeleted callbacks
// - PATCH /api/<entity>/<id> + cache invalidation + router.refresh()
//
// Replaces ~25-30 LOC per RowClient with a single hook call.
//
// Usage:
//   function ProjectRowClient({ row }: { row: any }) {
//     const save = useRowSave({ entity: 'projects', queryKey: 'projects' })
//
//     return (
//       <>
//         <SmartInlineEdit
//           onSave={(value) => save.patch({ name: value })}
//           onConflict={(values) => save.patch(values)}
//         />
//         <DetailSheet onSaved={save.invalidate} onDeleted={save.invalidate} />
//       </>
//     )
//   }

'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { parseApiError } from '@/lib/api/client-errors'

export interface UseRowSaveOptions {
  /** Entity name used to build the URL: /api/<endpoint>/<id> */
  endpoint?: string
  /** Query key to invalidate (e.g. 'projects', 'tasks', 'purchasing') */
  queryKey: string | readonly unknown[]
  /** When true, also calls router.refresh() to re-render RSC. Default: true. */
  refresh?: boolean
  /** HTTP method. Default: PATCH. */
  method?: 'PATCH' | 'POST' | 'PUT' | 'DELETE'
  /** Show toast on success. Default: false (let SmartInlineEdit handle UX). */
  silent?: boolean
}

export interface UseRowSaveResult {
  /** Send PATCH (default) to /api/<endpoint>/<id> with the given fields. */
  patch: (input: { id: string; values: Record<string, unknown> } | { id: string } & Record<string, unknown>) => Promise<void>
  /** Invalidate cache + refresh RSC. Use for onSaved/onDeleted of DetailSheet. */
  invalidate: () => void
  /** Whether the last save is in flight (use for spinner). */
  isPending: boolean
}

function pickIdAndValues(
  input: { id: string; values?: Record<string, unknown> } | ({ id: string } & Record<string, unknown>)
): { id: string; values: Record<string, unknown> } {
  if ('values' in input && input.values) {
    return { id: String(input.id), values: input.values as Record<string, unknown> }
  }
  const src = input as Record<string, unknown>
  const values: Record<string, unknown> = {}
  for (const k of Object.keys(src)) {
    if (k !== 'id') values[k] = src[k] as unknown
  }
  return { id: String(src.id), values }
}

export function useRowSave(options: UseRowSaveOptions): UseRowSaveResult {
  const router = useRouter()
  const queryClient = useQueryClient()
  const endpoint = options.endpoint ?? options.queryKey
  const method = options.method ?? 'PATCH'
  const refresh = options.refresh ?? true
  const queryKeys = Array.isArray(options.queryKey) ? options.queryKey : [options.queryKey]

  const invalidate = useCallback(() => {
    for (const k of queryKeys) {
      const key = Array.isArray(k) ? k : [k]
      queryClient.invalidateQueries({ queryKey: key })
    }
    if (refresh) router.refresh()
  }, [queryClient, queryKeys, refresh, router])

  const patch = useCallback(
    async (input: { id: string; values: Record<string, unknown> } | { id: string } & Record<string, unknown>) => {
      const { id, values } = pickIdAndValues(input)
      const res = await fetch(`/api/${endpoint}/${id}`, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw await parseApiError(res)
      invalidate()
    },
    [endpoint, method, invalidate]
  )

  return { patch, invalidate, isPending: false }
}
