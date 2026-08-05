// src/lib/auth/role-guard.ts
// Server-side role-based route access control for Syahfalah dashboard.
//
// Used by per-segment layout.tsx files to gate subtrees before page render.
// Renders an "Access denied" page on mismatch (no sensitive data leak).

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export type Role = 'owner' | 'kepala_kantor' | 'pic_divisi' | 'staff'

export interface SessionPayload {
  id: string
  role: Role
  divisionId?: string | null
  fullName?: string
}

// Role hierarchy: each tier inherits the rights of every tier below it.
// 'owner' > 'kepala_kantor' > 'pic_divisi' > 'staff'.
// `hasRoleAtLeast(userRole, required)` returns true when userRole >= required.
const HIERARCHY: Record<Role, number> = {
  staff: 1,
  pic_divisi: 2,
  kepala_kantor: 3,
  owner: 4,
}

export function hasRoleAtLeast(userRole: Role, required: Role): boolean {
  return HIERARCHY[userRole] >= HIERARCHY[required]
}

/** Decode the current request's JWT cookie. Returns null if unauthenticated. */
export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null
  const payload = await verifyAccessToken(token)
  if (!payload) return null
  return payload as unknown as SessionPayload
}

// Static-role gates (no row-level data ownership check).

export async function requireRole(min: Role): Promise<SessionPayload> {
  const session = await readSession()
  if (!session) redirect('/login')
  if (!hasRoleAtLeast(session.role, min)) redirect('/personal/tasks')
  return session
}

export async function requireExactRole(allowed: Role[]): Promise<SessionPayload> {
  const session = await readSession()
  if (!session) redirect('/login')
  if (!allowed.includes(session.role)) redirect('/personal/tasks')
  return session
}

// Row-level check: PICs may only see their own division.

export async function requireDivisionAccess(divisionId: string): Promise<SessionPayload> {
  const session = await readSession()
  if (!session) redirect('/login')
  // Owner and Kepala Kantor oversee all divisions.
  if (session.role === 'owner' || session.role === 'kepala_kantor') return session
  // PICs only see their assigned division.
  if (session.role === 'pic_divisi') {
    if (session.divisionId !== divisionId) redirect('/personal/tasks')
    return session
  }
  // Staff has no business in /divisi/*.
  redirect('/personal/tasks')
}
