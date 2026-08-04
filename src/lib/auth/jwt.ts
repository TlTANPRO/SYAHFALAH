// lib/auth/jwt.ts
// JWT token management for session handling.
//
// Security note: JWT_SECRET MUST be set in production. We refuse to use the
// development fallback string at runtime if NODE_ENV !== 'development'.

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'

const FALLBACK_SECRET = 'your-super-secret-jwt-key-change-in-production-min-32-chars'

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET
  if (!raw || raw.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set (>=32 chars) in production')
    }
    if (raw === FALLBACK_SECRET) {
      console.warn('[auth] JWT_SECRET is using the development fallback. Do NOT use in production.')
    }
  }
  return new TextEncoder().encode(raw || FALLBACK_SECRET)
}

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

export interface TokenPayload extends JWTPayload {
  userId: string
  email?: string
  name: string
  role: 'owner' | 'kepala_kantor' | 'pic_divisi' | 'staff'
  divisionId: string
  position: string
}

export interface Tokens {
  accessToken: string
  refreshToken: string
}

/**
 * Create access and refresh tokens
 */
export async function createTokens(payload: TokenPayload): Promise<Tokens> {
  const accessToken = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getSecret())

  const refreshToken = await new SignJWT({ userId: payload.userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getSecret())

  return { accessToken, refreshToken }
}

/**
 * Verify and decode access token
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

/**
 * Verify and decode refresh token
 */
export async function verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.type !== 'refresh') return null
    return { userId: payload.userId as string }
  } catch {
    return null
  }
}

/**
 * Set auth cookies in response
 */
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies()

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  })

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  })
}

/**
 * Clear auth cookies
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
}

/**
 * Get access token from cookies
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('access_token')?.value || null
}

/**
 * Get refresh token from cookies
 */
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('refresh_token')?.value || null
}

/**
 * Issue a fresh access token using a valid refresh token. Returns the new
 * access token string, or null if the refresh token is invalid or the user
 * no longer exists.
 */
export async function refreshAccessToken(supabaseAdmin: any): Promise<{ accessToken: string; refreshToken: string } | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null

  const payload = await verifyRefreshToken(refreshToken)
  if (!payload) return null

  // Fetch fresh user data from the database
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, role, division_id, position, is_active')
    .eq('id', payload.userId)
    .single()

  if (error || !user || !user.is_active) return null

  const tokens = await createTokens({
    userId: user.id,
    email: user.email,
    name: user.full_name,
    role: user.role,
    divisionId: user.division_id,
    position: user.position,
  })

  await setAuthCookies(tokens.accessToken, tokens.refreshToken)
  return tokens
}

/**
 * Extract user from request (for API routes)
 */
export async function getUserFromRequest(request: Request): Promise<TokenPayload | null> {
  const accessToken = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!accessToken) {
    // Try cookies
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const match = cookieHeader.match(/access_token=([^;]+)/)
      if (match) {
        return verifyAccessToken(match[1])
      }
    }
    return null
  }

  return verifyAccessToken(accessToken)
}
