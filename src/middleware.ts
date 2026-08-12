// middleware.ts
// Edge middleware - sets Vary: Cookie on personalized pages so edge caches
// each user\'s response separately. Without this, all logged-in users share
// a single edge cache entry, leaking personalization between users.
//
// Vercel edge respects Vary headers. For each unique Cookie value,
// edge stores a separate cached response (TTL = page\'s revalidate).
//
// Anonymous (no access_token cookie) requests share a single cache entry
// for the public landing page if any.

import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: [
    // Apply to all dashboard pages (personalized content)
    '/owner/:path*',
    '/admin/:path*',
    '/personal/:path*',
    '/kepala-kantor/:path*',
    '/divisi/:path*',
  ],
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // PUSH #2: Edge cache personalization.
  // Each user (each access_token cookie value) gets their own edge cache entry.
  // This is critical for /owner page — different users see different brief values.
  res.headers.set('Vary', 'Cookie')
  res.headers.set('Cache-Control', 'private, no-cache')  // honor the per-user freshness
  
  return res
}