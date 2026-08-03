// lib/auth/jwt.ts
// JWT token management for session handling

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars'
)

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
    .sign(JWT_SECRET)

  const refreshToken = await new SignJWT({ userId: payload.userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET)

  return { accessToken, refreshToken }
}

/**
 * Verify and decode access token
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
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
    const { payload } = await jwtVerify(token, JWT_SECRET)
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
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null

  const payload = await verifyRefreshToken(refreshToken)
  if (!payload) return null

  // Get fresh user data from database
  // This would typically call a user service
  // For now, we'll need the user data passed in or fetched
  
  return null // Will be implemented with user lookup
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