// lib/api/auth-guard.ts
// Centralized auth + role check for API routes.
// Replaces 7-line auth boilerplate that was duplicated in 23+ routes.
//
// Usage:
//   const session = await requireAuth()           // any logged-in user
//   const session = await requireRole('owner')    // specific role
//   const session = await requireAnyRole(['owner', 'kepala_kantor'])

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyAccessToken, type TokenPayload } from '@/lib/auth/jwt'
import { buildError } from '@/lib/api/errors'

export type Role = 'owner' | 'kepala_kantor' | 'pic_divisi' | 'staff' | 'system'

export interface Session {
  userId: string
  role: Role
  email?: string
  divisionId?: string | null
}

/**
 * Extract and verify the access token from cookies.
 * Returns null if unauthenticated or token invalid.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return null
    const payload: TokenPayload | null = await verifyAccessToken(token)
    if (!payload) return null
    return {
      userId: payload.userId as string,
      role: ((payload as any).role as Role) || 'staff',
      email: (payload as any).email as string | undefined,
      divisionId: (payload as any).divisionId ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Require authenticated session. Returns either a session or a NextResponse
 * (the route handler should immediately `return sessionOrResponse`).
 */
export async function requireAuth(): Promise<Session | NextResponse> {
  const session = await getSession()
  if (!session) {
    return buildError('UNAUTHORIZED')
  }
  return session
}

/**
 * Require a specific role. Returns 403 if session has different role.
 */
export async function requireRole(role: Role): Promise<Session | NextResponse> {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session
  if (session.role !== role) {
    return buildError('FORBIDDEN', `Requires role: ${role}`)
  }
  return session
}

/**
 * Require any of the listed roles. Returns 403 if session has different role.
 */
export async function requireAnyRole(roles: Role[]): Promise<Session | NextResponse> {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session
  if (!roles.includes(session.role)) {
    return buildError('FORBIDDEN', `Requires role: ${roles.join(' or ')}`)
  }
  return session
}

/**
 * Type guard: is this a NextResponse (error) or a Session?
 */
export function isError(result: Session | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}