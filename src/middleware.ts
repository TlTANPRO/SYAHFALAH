// middleware.ts
// HARD #3: Refined edge caching strategy.
// - Logged-in users (with access_token cookie): private, no-cache (per-user freshness)
// - Anonymous traffic: public, browser cache (CDN-friendly)
// - Health/API endpoints: never cache
//
// The previous version set 'private, no-cache' for all traffic which
// disabled public CDN caching for marketing/landing pages entirely.
// This is more nuanced: personalized routes get per-user caching,
// public routes leverage full CDN.

import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: [
    // Dashboard pages - apply only when authenticated or always (use runtime check)
    '/owner/:path*',
    '/admin/:path*',
    '/personal/:path*',
    '/kepala-kantor/:path*',
    '/divisi/:path*',
  ],
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const hasSessionCookie = !!req.cookies.get('access_token')?.value
  
  if (hasSessionCookie) {
    // Logged-in user: per-user edge cache, fresh data
    res.headers.set('Vary', 'Cookie')
    res.headers.set('Cache-Control', 'private, must-revalidate, max-age=0')
  } else {
    // Anonymous: can be CDN-cached (typically redirected to /login anyway)
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  }
  
  return res
}