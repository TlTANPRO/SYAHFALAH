// lib/auth/rate-limit.ts
//
// In-memory rate limiter for the PIN endpoint. Uses a sliding window of
// failed attempts per IP. Resets on success or after the window expires.
//
// For multi-instance deployments (Vercel concurrency, cold starts) this
// would be replaced with Redis / Vercel KV. For Syahfalah's single-region
// dashboard, in-memory is sufficient and zero-config.

interface Attempt {
  count: number
  firstAt: number
}

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_ATTEMPTS = 5

const store = new Map<string, Attempt>()

/**
 * Check whether a provided identifier (IP, user ID, etc.) may attempt a
 * further login. Returns `{ allowed: true }` after recording the attempt,
 * or `{ allowed: false, retryAfterMs }` if the limit has been reached.
 */
export function checkRateLimit(identifier: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const existing = store.get(identifier)

  if (!existing || now - existing.firstAt > WINDOW_MS) {
    store.set(identifier, { count: 1, firstAt: now })
    return { allowed: true }
  }

  if (existing.count >= MAX_ATTEMPTS) {
    const retryAfterMs = WINDOW_MS - (now - existing.firstAt)
    return { allowed: false, retryAfterMs }
  }

  existing.count += 1
  store.set(identifier, existing)
  return { allowed: true }
}

/**
 * Reset the rate limit counter for an identifier (e.g. on successful login).
 */
export function resetRateLimit(identifier: string) {
  store.delete(identifier)
}

/**
 * Pull the client IP from a Next.js request. Handles both `x-forwarded-for`
 * (Vercel / proxy) and `x-real-ip` (nginx). The first IP in the
 * comma-separated list is the originating client.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const xri = request.headers.get('x-real-ip')
  if (xri) return xri.trim()
  return 'unknown'
}
