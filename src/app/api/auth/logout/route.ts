// app/api/auth/logout/route.ts
// Clear auth cookies. Always returns 200.

import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth/jwt'

export async function POST() {
  await clearAuthCookies()
  return NextResponse.json({ success: true })
}
