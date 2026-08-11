// hooks/useEntityOne.ts
// Generic single-item fetch hook for entity tables.
//
//   const { data: task, isLoading } = useEntityOne<Task>('tasks', taskId)
//
// Returns `null` while loading or when id is empty.
// Auto-handles 404 by returning null (not throwing).

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

export interface UseEntityOneOptions<T> {
  enabled?: boolean
  staleTime?: number
  queryOptions?: Omit<UseQueryOptions<T | null>, 'queryKey' | 'queryFn'>
}

/**
 * Fetch a single entity by ID.
 *
 * @param entity - Entity name (e.g. 'tasks', 'approvals'). Used to build the URL.
 * @param id - Row ID. Pass empty string to skip the query.
 * @param options - Additional react-query options.
 */
export function useEntityOne<T = unknown>(
  entity: string,
  id: string | null | undefined,
  options: UseEntityOneOptions<T> = {}
) {
  const hasId = Boolean(id)
  return useQuery<T | null>({
    queryKey: [entity, 'one', id],
    queryFn: async () => {
      if (!id) return null
      const res = await fetch(`/api/${entity}/${id}`, { credentials: 'include' })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      // Some routes return { data: ... } wrapper, some return raw row.
      return (body?.data ?? body) as T
    },
    enabled: (options.enabled ?? true) && hasId,
    staleTime: options.staleTime ?? 30_000,
    ...options.queryOptions,
  })
}
