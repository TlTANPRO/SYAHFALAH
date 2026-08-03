// app/api/auth/pin/route.ts
// PIN verification endpoint

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPin } from '@/lib/auth/pin'
import { createTokens } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  // IMMEDIATE LOG at function entry
  console.log('[AUTH] >>> FUNCTION ENTRY - POST /api/auth/pin')
  
  try {
    const { pin } = await request.json()
    console.log('[AUTH] PIN received:', pin ? 'SET' : 'MISSING')

    if (!pin || !/^\d{4}$/.test(pin)) {
      console.log('[AUTH] Invalid PIN format')
      return NextResponse.json(
        { success: false, error: 'PIN harus 4 digit angka' },
        { status: 400 }
      )
    }

    // Debug: Check if env vars are loaded
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const jwtSecret = process.env.JWT_SECRET
    
    console.log('[AUTH] ===== AUTH START =====')
    console.log('[AUTH] SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING', supabaseUrl?.substring(0, 50))
    console.log('[AUTH] SERVICE_ROLE_KEY:', serviceRoleKey ? 'SET' : 'MISSING')
    console.log('[AUTH] JWT_SECRET:', jwtSecret ? 'SET' : 'MISSING')

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[AUTH] Missing Supabase env vars')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create Supabase admin client inline (avoid module-load-time issues)
    let supabaseAdmin
    try {
      supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      console.log('[AUTH] Supabase admin client created successfully')
    } catch (clientError) {
      console.error('[AUTH] Failed to create Supabase client:', clientError)
      return NextResponse.json(
        { success: false, error: 'Database client creation failed: ' + String(clientError) },
        { status: 500 }
      )
    }

    console.log('[AUTH] Supabase admin client created, querying...')

    // Find active user with matching PIN using service role (bypass RLS)
    let users, error
    try {
      console.log('[AUTH] About to execute query...')
      const result = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('is_active', true)
      users = result.data
      error = result.error
      console.log('[AUTH] Query completed. Users:', users?.length || 0, 'Error:', error?.message || 'none', 'Error code:', error?.code || 'none', 'Error details:', error?.details || 'none', 'Error hint:', error?.hint || 'none')
    } catch (queryError) {
      console.error('[AUTH] Query threw exception:', queryError)
      return NextResponse.json(
        { success: false, error: 'Database query failed: ' + String(queryError) },
        { status: 500 }
      )
    }

    if (error || !users || users.length === 0) {
      console.log('[AUTH] No users found or error')
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      )
    }

    console.log('[AUTH] Found users:', users.map(u => ({name: u.full_name, role: u.role, hasHash: !!u.pin_hash, hasSalt: !!u.pin_salt})))

    // Verify PIN against each user
    let matchedUser = null
    for (const user of users) {
      console.log('[AUTH] Checking user:', user.full_name, 'hash_len:', user.pin_hash?.length, 'salt_len:', user.pin_salt?.length)
      const isValid = verifyPin(pin, user.pin_hash, user.pin_salt)
      console.log('[AUTH] verifyPin result for', user.full_name, ':', isValid)
      if (isValid) {
        matchedUser = user
        break
      }
    }

    if (!matchedUser) {
      console.log('[AUTH] No matched user found')
      return NextResponse.json(
        { success: false, error: 'PIN salah' },
        { status: 401 }
      )
    }

    console.log('[AUTH] Matched user:', matchedUser.full_name)

    // Create tokens
    const { accessToken, refreshToken } = await createTokens({
      userId: matchedUser.id,
      email: matchedUser.email,
      name: matchedUser.full_name,
      role: matchedUser.role,
      divisionId: matchedUser.division_id,
      position: matchedUser.position,
    })

    // Set auth cookies
    await setAuthCookies(accessToken, refreshToken)

    // Return user data (without sensitive fields)
    const { pin_hash, pin_salt, ...safeUser } = matchedUser

    console.log('[AUTH] ===== AUTH SUCCESS =====')
    return NextResponse.json({
      success: true,
      user: safeUser,
    })
  } catch (error) {
    console.error('[AUTH] PIN auth error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server: ' + String(error) },
      { status: 500 }
    )
  }
}