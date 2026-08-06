// middleware.ts
// Custom JWT-based authentication middleware. Also strips aggressive
// CDN caching for dynamic (user-data) routes so Vercel's edge doesn't
// serve stale HTML when we ship a new commit (Age=9h observed 5-Aug).
// Additionally, logs every /api/* hit to api_gateway_log table for
// observability (foundation for Phase 5 ops work).

import { NextResponse, type NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'

// Routes that contain user-specific data and must never be cached at
// the edge. Public/asset routes are excluded from this list so Vercel
// can still cache static chunks aggressively.
const NO_STORE_PATHS = [
  '/owner',
  '/kepala-kantor',
  '/divisi',
  '/personal',
  '/admin',
  '/sow',
  '/kpi',
  '/task',
  '/raci',
  '/rewards',
  '/calendar',
  '/settings',
  '/login',
  '/api',
]

export async function middleware(request: NextRequest) {
  const noStore = NO_STORE_PATHS.some(p => request.nextUrl.pathname.startsWith(p))

  // Verify custom JWT token from cookies
  const accessToken = request.cookies.get('access_token')?.value
  let user = null

  if (accessToken) {
    user = await verifyAccessToken(accessToken)
  }

  // Protected routes
  const protectedPaths = [
    '/owner',
    '/kepala-kantor',
    '/divisi',
    '/personal',
    '/admin',
    '/sow',
    '/kpi',
    '/task',
    '/raci',
    '/rewards',
    '/calendar',
    '/settings',
  ]

  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Public paths that don't need auth
  const publicPaths = ['/login', '/api/auth']
  const isPublicPath = publicPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Redirect to login if accessing protected path without auth
  if (isProtectedPath && !user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return applyNoStore(NextResponse.redirect(url))
  }

  // Redirect to dashboard if accessing login while authenticated
    if (request.nextUrl.pathname === '/login' && user) {
      // Redirect by role so user lands on the right dashboard,
      // not a generic '/' that itself may redirect to /login when cookies
      // are not yet visible to the server-side RSC after a soft nav.
      let dest = '/personal/tasks'
      switch (user.role) {
        case 'owner':
          dest = '/owner'
          break
        case 'kepala_kantor':
          dest = '/kepala-kantor'
          break
        case 'pic_divisi':
          dest = `/divisi/${user.divisionId}`
          break
        case 'staff':
        default:
          dest = '/personal/tasks'
          break
      }
      const url = request.nextUrl.clone()
      url.pathname = dest
      return applyNoStore(NextResponse.redirect(url))
    }

  const t0 = Date.now()
  const res = NextResponse.next()
  if (noStore) applyNoStore(res)

  // Fire-and-forget gateway log for /api/* requests (no await, no DB
  // pressure on hot path). Failures silently dropped.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    logApiHit(request, res.status, Date.now() - t0, user?.userId)
  }

  return res
}

async function logApiHit(req: NextRequest, status: number, durationMs: number, userId: string | undefined) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    await sb.from('api_gateway_log').insert({
      user_id: userId ?? null,
      method: req.method,
      path: req.nextUrl.pathname,
      status_code: status,
      duration_ms: durationMs,
      ip_address: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    })
  } catch {
    // intentional no-op
  }
}

function applyNoStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0')
  res.headers.set('Pragma', 'no-cache')
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}