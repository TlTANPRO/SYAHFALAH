// hooks/useEntityMutation.ts
// Generic mutation hook for entity POST/PATCH/DELETE endpoints.
// Replaces 15-20 LOC of useMutation boilerplate per call site with:
//
//   const update = useEntityMutation<Task>('tasks', 'PATCH')
//   update.mutate({ id, status })
//
// Features:
// - Auto credentialed fetch
// - Auto-invalidates matching list query on success
// - TypeScript inference for input + response
// - Standardized error extraction from { error: { message } } shape
//
// Note: For actions that target a different URL than /api/<entity>, use the
// `endpoint` option (e.g. QuickAdd dialog uses /api/marketing/leads).

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query'
import { useUIStore } from '@/stores/uiStore'
import { parseApiError } from '@/lib/api/client-errors'

export type EntityMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface UseEntityMutationOptions<TInput, TResponse>
  extends Omit<UseMutationOptions<TResponse, Error, TInput>, 'mutationFn'> {
  /** Override the endpoint (e.g. '/api/marketing/leads' for QuickAdd) */
  endpoint?: string | ((input: TInput) => string)
  /** Query key to invalidate on success (e.g. ['tasks', 'list', ...]) */
  invalidateKeys?: ReadonlyArray<readonly unknown[]>
  /** Show a success toast on resolve */
  successMessage?: string | ((response: TResponse) => string)
  /** Show an error toast on reject */
  errorMessage?: string | ((err: Error) => string)
  /** Skip auto-invalidation (e.g. for bulk operations that handle their own cache) */
  skipInvalidate?: boolean
}

/**
 * Mutation hook for a single entity. Auto-invalidates list queries on success.
 *
 * @param entity - Entity name (e.g. 'tasks', 'approvals'). Used to build the default URL `/api/<entity>`.
 * @param method - HTTP method (POST, PATCH, PUT, DELETE).
 * @param options - Mutation + invalidation + toast options.
 */
export function useEntityMutation<TInput = unknown, TResponse = unknown>(
  entity: string,
  method: EntityMethod = 'POST',
  options: UseEntityMutationOptions<TInput, TResponse> = {}
) {
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  return useMutation<TResponse, Error, TInput>({
    mutationFn: async (input: TInput) => {
      const url = typeof options.endpoint === 'function'
        ? options.endpoint(input)
        : options.endpoint ?? `/api/${entity}`
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        // DELETE typically sends no body; PATCH/POST send JSON
        ...(method === 'DELETE' ? {} : { body: JSON.stringify(input) }),
      })
      if (!res.ok) {
        // Use the typed parser to extract the standardized error message
        const apiErr = await parseApiError(res)
        throw apiErr
      }
      // 204 No Content has no body
      if (res.status === 204) return undefined as TResponse
      return res.json() as Promise<TResponse>
    },
    onSuccess: (data, vars, ctx) => {
      // Auto-invalidate the matching list query (unless opted out)
      if (!options.skipInvalidate) {
        const keys = options.invalidateKeys ?? [[entity, 'list']]
        for (const k of keys) {
          queryClient.invalidateQueries({ queryKey: [...k] })
        }
      }
      // Optional success toast
      if (options.successMessage) {
        const msg = typeof options.successMessage === 'function'
          ? options.successMessage(data)
          : options.successMessage
        addToast({ type: 'success', title: msg, message: '' })
      }
      // Forward to caller's onSuccess
      if (options.onSuccess) {
        // @ts-expect-error - variadic context typing
        options.onSuccess(data, vars, ctx)
      }
    },
    onError: (err, vars, ctx) => {
      // Optional error toast
      if (options.errorMessage) {
        const msg = typeof options.errorMessage === 'function'
          ? options.errorMessage(err)
          : options.errorMessage
        addToast({ type: 'destructive', title: msg, message: '' })
      } else {
        addToast({ type: 'destructive', title: 'Gagal', message: err.message })
      }
      // Forward to caller's onError
      if (options.onError) {
        // @ts-expect-error - variadic context typing
        options.onError(err, vars, ctx)
      }
    },
  })
}
