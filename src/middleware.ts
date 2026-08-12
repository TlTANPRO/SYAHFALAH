// middleware.ts
// P0-2: Edge middleware - route-level RBAC + cache personalization.
// Bug #2+#3 fix: previous layout-level RBAC was ineffective because
// (dashboard)/layout.tsx is 'use client' — server-component child layouts
// cannot reliably throw NEXT_REDIRECT through a client-component tree.
// Moving RBAC to middleware (which runs on the edge BEFORE any layout) gives full control.
//
// PUSH #2: Edge cache personalization via Vary: Cookie header.
// HARD #3: Cookie-aware Cache-Control.

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'

type Role = 'owner' | 'kepala_kantor' | 'pic_divisi' | 'staff'

const HIERARCHY: Record<Role, number> = {
  staff: 1,
  pic_divisi: 2,
  kepala_kantor: 3,
  owner: 4,
}

function hasRoleAtLeast(userRole: Role, required: Role): boolean {
  return HIERARCHY[userRole] >= HIERARCHY[required]
}

// P0-2: Map of URL patterns → required minimum role.
// If a user doesn't meet the requirement, redirect to /forbidden?reason=role.
const ROUTE_RBAC: Array<{ pattern: RegExp; required: Role; label: string }> = [
  { pattern: /^\/owner(\/|$)/, required: 'owner', label: '/owner' },              // owner only (Pak Ardian)
  { pattern: /^\/admin(\/|$)/, required: 'owner', label: '/admin' },              // owner only
  { pattern: /^\/kepala-kantor(\/|$)/, required: 'kepala_kantor', label: '/kepala-kantor' }, // Mada
  { pattern: /^\/divisi(\/|$)/, required: 'pic_divisi', label: '/divisi' },       // pic_divisi
]

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname
  const hasSessionCookie = !!req.cookies.get('access_token')?.value

  // P0-2: RBAC enforcement
  if (hasSessionCookie) {
    const token = req.cookies.get('access_token')!.value
    const payload: any = await verifyAccessToken(token)
    const userRole: Role | null = (payload?.role as Role) ?? null

    if (userRole) {
      for (const route of ROUTE_RBAC) {
        if (route.pattern.test(url)) {
          if (!hasRoleAtLeast(userRole, route.required)) {
            const forbiddenUrl = new URL('/forbidden?reason=role', req.url)
            forbiddenUrl.searchParams.set('required', route.required)
            forbiddenUrl.searchParams.set('actual', userRole)
            forbiddenUrl.searchParams.set('route', route.label)
            return NextResponse.redirect(forbiddenUrl)
          }
          break  // only first matching rule
        }
      }
    }
  }

  // PUSH #2 + HARD #3: Cache headers
  const res = NextResponse.next()
  if (hasSessionCookie) {
    res.headers.set('Vary', 'Cookie')
    res.headers.set('Cache-Control', 'private, must-revalidate, max-age=0')
  } else {
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  }

  return res
}

export const config = {
  matcher: [
    // Apply to all dashboard pages (these need RBAC + cache personalization)
    '/owner/:path*',
    '/admin/:path*',
    '/personal/:path*',
    '/kepala-kantor/:path*',
    '/divisi/:path*',
  ],
}

// Forcing change for redeploy
