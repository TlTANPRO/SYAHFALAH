// lib/api/safe-fetch.ts
// Client-side fetch wrapper that handles 401 specially.
// On 401: clear local auth state (zustand) and redirect to /login.
// On other errors: return parsed response normally.
//
// USAGE:
//   const res = await safeFetch('/api/notifications?limit=20')
//   if (!res.ok) return []
//   return await res.json()
//
// This wrapper does NOT throw. The bell's `if (!res.ok) return []` pattern
// is preserved for safety.

'use client'

import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

/**
 * Like fetch(), but:
 * - On 401, clears local auth state and redirects to /login.
 *   This prevents the bell / settings / etc from firing endless 401s when
 *   the user has a stale localStorage session but the server-side cookie has
 *   expired.
 * - On other non-2xx, returns the raw Response so callers can decide.
 *
 * Always returns a Response (never throws).
 */
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let res: Response
  try {
    res = await fetch(input, {
      credentials: 'include',
      ...init,
    })
  } catch (networkError) {
    if (typeof console !== 'undefined') {
      console.warn('[safeFetch] Network error:', networkError)
    }
    return new Response(JSON.stringify({ error: 'network' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (res.status === 401) {
    handle401()
  }

  return res
}

/**
 * Singleton guard: only redirect/clear once per page session, even if many
 * fetches return 401. This prevents redirect storms.
 */
let handling401 = false

function handle401(): void {
  if (handling401) return
  handling401 = true

  if (typeof window === 'undefined') return

  // Clear auth store synchronously
  try {
    useAuthStore.getState().logout()
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth-storage')
    }
  } catch {
    // Auth store not yet initialized; that's fine, the redirect still works.
  }

  // Show toast (best-effort)
  try {
    useUIStore.getState().addToast({
      type: 'warning',
      title: 'Sesi habis',
      // description not in Toast type,
    })
  } catch {}

  // Redirect to /login (preserve redirect param if any)
  const current = window.location.pathname + window.location.search
  const redirect = current.startsWith('/login') ? '' : `?redirect=${encodeURIComponent(current)}`
  // Use replace so back button doesn't go back to the broken session
  window.location.replace(`/login${redirect}`)

  // Reset guard after 5s in case user comes back
  setTimeout(() => { handling401 = false }, 5000)
}

/**
 * Reset the 401 handling guard. Useful for tests or when manually re-authenticating.
 */
export function reset401Guard(): void {
  handling401 = false
}