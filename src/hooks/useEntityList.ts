// hooks/useEntityList.ts
// Generic list-fetching hook for any entity table that follows the
// standardized { data, total, page, pageSize } API response shape.
//
// Replaces ~20-30 LOC of useQuery boilerplate per page with a single line:
//   const { data, total, isLoading } = useEntityList('users', { q, role, page })
//
// Features:
// - Auto credentialed fetch
// - TypeScript inference via generics
// - Empty-state fallback (returns { data: [], total: 0 } on error)
// - queryKey namespace per entity
// - SSR-friendly: pass `initialData` for first-page render
//
// Migrate from:
//   const { data } = useQuery({
//     queryKey: ['admin-users', q, role, page],
//     queryFn: async () => {
//       const params = new URLSearchParams({ page: String(page) })
//       if (q) params.set('q', q)
//       const res = await fetch(`/api/users?${params}`, { credentials: 'include' })
//       if (!res.ok) return { data: [], total: 0, page, pageSize }
//       return res.json()
//     }
//   })
//   const rows = data?.data ?? []

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface UseEntityListOptions<T> {
  /** Initial data for first-page render (SSR-friendly) */
  initialData?: { data: T[]; total: number }
  /** Disable auto-refetch on window focus (default: true) */
  enabled?: boolean
  /** Stale time in ms (default: 30s) */
  staleTime?: number
  /** Additional query options */
  queryOptions?: Omit<UseQueryOptions<ListResponse<T>>, 'queryKey' | 'queryFn'>
}

/**
 * Fetch a paginated list of an entity.
 *
 * @param entity - The entity name (e.g. 'users', 'tasks', 'approvals'). Used to build the queryKey and as the default URL path.
 * @param params - Object of query params. Empty/undefined values are dropped.
 * @param options - Additional react-query options.
 */
export function useEntityList<T = unknown>(
  entity: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
  options: UseEntityListOptions<T> = {}
) {
  // Strip undefined/null/empty values, then stringify
  const cleanParams: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    cleanParams[k] = String(v)
  }
  const search = new URLSearchParams(cleanParams).toString()
  const url = `/api/${entity}${search ? `?${search}` : ''}`

  return useQuery<ListResponse<T>>({
    queryKey: [entity, 'list', cleanParams],
    queryFn: async () => {
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) {
        return { data: [], total: 0, page: 1, pageSize: 25 }
      }
      const body = await res.json()
      // Handle both wrapped { data, total, ... } and bare array responses.
      // Standardized shape since Phase 1.
      if (Array.isArray(body)) {
        return { data: body as T[], total: body.length, page: 1, pageSize: body.length }
      }
      return {
        data: Array.isArray(body?.data) ? body.data : [],
        total: typeof body?.total === 'number' ? body.total : 0,
        page: typeof body?.page === 'number' ? body.page : 1,
        pageSize: typeof body?.pageSize === 'number' ? body.pageSize : 25,
      }
    },
    staleTime: options.staleTime ?? 30_000,
    enabled: options.enabled ?? true,
    ...(options.initialData
      ? { initialData: { ...options.initialData, page: 1, pageSize: options.initialData.data.length } }
      : {}),
    ...options.queryOptions,
  })
}
