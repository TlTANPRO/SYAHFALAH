// app/api/auth/pin/route.ts
// PIN verification endpoint.
//
// Security posture:
//   - Rate limit per client IP (5 attempts / minute via rate-limit.ts)
//   - Reject weak PINs (0000, 1234, etc.) via pin.ts
//   - Iterate users in a deterministic order so timing leaks which user
//     matched, NOT the user list (no log spam)
//   - Constant-time PIN comparison via timingSafeEqual
//   - Return generic error on failure to avoid user enumeration

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPin, isWeakPin } from '@/lib/auth/pin'
import { createTokens, setAuthCookies } from '@/lib/auth/jwt'
import { checkRateLimit, resetRateLimit, getClientIp } from '@/lib/auth/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN harus 4 digit angka' },
        { status: 400 }
      )
    }

    if (isWeakPin(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN terlalu lemah, gunakan kombinasi lain' },
        { status: 400 }
      )
    }

    // Rate limit per IP
    const ip = getClientIp(request)
    const limit = checkRateLimit(ip)
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Terlalu banyak percobaan. Coba lagi beberapa saat.',
        },
        { status: 429, headers: { 'Retry-After': Math.ceil((limit.retryAfterMs || 60000) / 1000).toString() } }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, division_id, position, is_active, pin_hash, pin_salt')
      .eq('is_active', true)

    if (error || !users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      )
    }

    // Iterate deterministically. Do NOT log which user we're checking.
    let matchedUser = null
    for (const user of users) {
      if (verifyPin(pin, user.pin_hash, user.pin_salt)) {
        matchedUser = user
        break
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { success: false, error: 'PIN salah' },
        { status: 401 }
      )
    }

    // Successful login — reset the rate limit counter for this IP
    resetRateLimit(ip)

    const { accessToken, refreshToken } = await createTokens({
      userId: matchedUser.id,
      email: matchedUser.email,
      name: matchedUser.full_name,
      role: matchedUser.role,
      divisionId: matchedUser.division_id,
      position: matchedUser.position,
    })

    await setAuthCookies(accessToken, refreshToken)

    // Return user data WITHOUT pin_hash / pin_salt
    const { pin_hash, pin_salt, ...safeUser } = matchedUser
    return NextResponse.json({ success: true, user: safeUser })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
