// lib/auth/session.ts
// Server-side session management

import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import type { User, UserRole } from '@/types/domain'

export interface Session {
  user: User | null
  accessToken: string | null
}

const emptyNotificationPrefs = {
  morning_brief: { in_app: true, push: true, whatsapp: true, email: false },
  deadline: { in_app: true, push: true, whatsapp: false, email: false },
  overdue: { in_app: true, push: true, whatsapp: true, email: false },
  new_task: { in_app: true, push: true, whatsapp: false, email: false },
  carry_over: { in_app: true, push: true, whatsapp: false, email: false },
  kpi_at_risk: { in_app: true, push: true, whatsapp: true, email: false },
  mention: { in_app: true, push: true, whatsapp: false, email: false },
  approval_request: { in_app: true, push: true, whatsapp: false, email: false },
}

export async function getServerSession(): Promise<Session> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value
  
  if (!accessToken) {
    return { user: null, accessToken: null }
  }

  // Verify custom JWT token
  const payload = await verifyAccessToken(accessToken)
  
  if (!payload) {
    return { user: null, accessToken: null }
  }

  // Map JWT payload to User interface
  const user: User = {
    id: payload.userId,
    companyId: '11111111-1111-1111-1111-111111111111', // default company
    divisionId: payload.divisionId || '',
    name: payload.name,
    email: payload.email || null,
    phone: null,
    role: payload.role as UserRole,
    position: payload.position,
    pinHash: '',
    pinSalt: '',
    avatarUrl: null,
    isActive: true,
    joinDate: new Date().toISOString(),
    reportsTo: null,
    notificationPrefs: emptyNotificationPrefs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return {
    user,
    accessToken,
  }
}

export async function verifyPinAndCreateSession(
  identifier: string,
  pin: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  return { success: false, error: 'Use /api/auth/pin endpoint' }
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
}