// middleware.ts
// Custom JWT-based authentication middleware

import { NextResponse, type NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function middleware(request: NextRequest) {
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
    return NextResponse.redirect(url)
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
      return NextResponse.redirect(url)
    }

  return NextResponse.next()
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