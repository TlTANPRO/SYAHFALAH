// app/api/auth/refresh/route.ts
// Refresh the access token using the refresh token from cookies.
// Returns the new access token (also set in the response cookies).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { refreshAccessToken } from '@/lib/auth/jwt'

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ success: false, error: 'Server config error' }, { status: 500 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const tokens = await refreshAccessToken(supabaseAdmin)
  if (!tokens) {
    return NextResponse.json({ success: false, error: 'Refresh failed or expired' }, { status: 401 })
  }

  return NextResponse.json({ success: true })
}
