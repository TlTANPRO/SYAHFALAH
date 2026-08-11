// lib/api/errors.ts
// Standardized API error responses.
//
// Goals:
// 1. Consistent shape: { error: { code, message, severity, hint? } }
// 2. Never leak raw SQL / PostgREST messages to clients.
// 3. Friendly Indonesian messages by default.
// 4. Numeric status codes match semantics:
//    400 = bad request (validation, FK violation, etc.)
//    401 = unauthenticated
//    403 = forbidden (RBAC)
//    404 = not found
//    405 = method not allowed (only when method truly not allowed)
//    409 = conflict (duplicate, optimistic lock)
//    429 = rate limit
//    500 = server error (unexpected, generic message)

import { NextResponse } from 'next/server'

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'METHOD_NOT_ALLOWED'
  | 'CONFLICT'
  | 'RATE_LIMIT'
  | 'INTERNAL'
  | 'FK_VIOLATION'
  | 'DUPLICATE_KEY'
  | 'CHECK_VIOLATION'
  | 'UNKNOWN_ENTITY'
  | 'INVALID_PAYLOAD'

export interface ApiError {
  error: {
    code: ErrorCode
    message: string
    severity: 'info' | 'warning' | 'error' | 'critical'
    hint?: string
  }
}

const STATUS_FOR_CODE: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  RATE_LIMIT: 429,
  INTERNAL: 500,
  FK_VIOLATION: 400, // friendly: 400, not 500
  DUPLICATE_KEY: 409,
  CHECK_VIOLATION: 400,
  UNKNOWN_ENTITY: 400,
  INVALID_PAYLOAD: 400,
}

/**
 * Map common Supabase/PostgREST error messages to friendly codes + messages.
 * Returns the original code if not recognized.
 */
export function classifyDbError(message: string): { code: ErrorCode; message: string } {
  const m = message.toLowerCase()
  if (m.includes('foreign key')) {
    return { code: 'FK_VIOLATION', message: 'Tidak dapat menghapus/mengubah data yang masih direferensikan' }
  }
  if (m.includes('duplicate key') || m.includes('unique constraint')) {
    return { code: 'DUPLICATE_KEY', message: 'Data duplikat, gunakan nilai lain' }
  }
  if (m.includes('check constraint')) {
    return { code: 'CHECK_VIOLATION', message: 'Nilai tidak sesuai aturan validasi' }
  }
  if (m.includes('not found') || m.includes('no rows')) {
    return { code: 'NOT_FOUND', message: 'Data tidak ditemukan' }
  }
  if (m.includes('permission denied') || m.includes('row-level security')) {
    return { code: 'FORBIDDEN', message: 'Tidak punya akses' }
  }
  // Default: return as-is with 500 (server error)
  return { code: 'INTERNAL', message: 'Terjadi kesalahan server' }
}

/**
 * Build a NextResponse with the standardized error shape.
 */
export function buildError(
  code: ErrorCode,
  customMessage?: string,
  hint?: string
): NextResponse<ApiError> {
  const defaults: Record<ErrorCode, string> = {
    UNAUTHORIZED: 'Sesi berakhir, silakan login ulang',
    FORBIDDEN: 'Anda tidak punya akses untuk aksi ini',
    NOT_FOUND: 'Data tidak ditemukan',
    BAD_REQUEST: 'Permintaan tidak valid',
    METHOD_NOT_ALLOWED: 'Metode HTTP tidak didukung',
    CONFLICT: 'Konflik data',
    RATE_LIMIT: 'Terlalu banyak percobaan, coba lagi nanti',
    INTERNAL: 'Terjadi kesalahan server',
    FK_VIOLATION: 'Tidak dapat menghapus/mengubah data yang masih direferensikan',
    DUPLICATE_KEY: 'Data duplikat',
    CHECK_VIOLATION: 'Nilai tidak sesuai aturan validasi',
    UNKNOWN_ENTITY: 'Entity tidak dikenali',
    INVALID_PAYLOAD: 'Payload tidak valid',
  }
  const severity: ApiError['error']['severity'] =
    code === 'UNAUTHORIZED' || code === 'FORBIDDEN'
      ? 'warning'
      : code === 'INTERNAL'
        ? 'critical'
        : code === 'RATE_LIMIT' || code === 'CONFLICT' || code === 'DUPLICATE_KEY'
          ? 'warning'
          : 'error'
  const body: ApiError = {
    error: {
      code,
      message: customMessage ?? defaults[code],
      severity,
      ...(hint ? { hint } : {}),
    },
  }
  return NextResponse.json(body, { status: STATUS_FOR_CODE[code] })
}

/**
 * Convenience helpers. Use these instead of buildError() for common cases.
 */
export const apiError = {
  unauthorized: (msg?: string) => buildError('UNAUTHORIZED', msg),
  forbidden: (msg?: string) => buildError('FORBIDDEN', msg),
  notFound: (msg?: string) => buildError('NOT_FOUND', msg),
  badRequest: (msg?: string, hint?: string) => buildError('BAD_REQUEST', msg, hint),
  methodNotAllowed: (msg?: string) => buildError('METHOD_NOT_ALLOWED', msg),
  conflict: (msg?: string) => buildError('CONFLICT', msg),
  rateLimit: (msg?: string) => buildError('RATE_LIMIT', msg),
  internal: (msg?: string) => buildError('INTERNAL', msg),
  unknownEntity: (entity: string) =>
    buildError('UNKNOWN_ENTITY', `Entity '${entity}' tidak dikenali`),
  invalidPayload: (msg?: string) => buildError('INVALID_PAYLOAD', msg),
}

/**
 * Wrap an unknown error (likely a Supabase/PostgREST message) into a friendly
 * NextResponse. Use this in catch blocks:
 *
 *   } catch (e) {
 *     return wrapDbError(e)
 *   }
 */
export function wrapDbError(e: unknown, fallback?: string): NextResponse<ApiError> {
  const msg = e instanceof Error ? e.message : String(e)
  const { code, message } = classifyDbError(msg)
  return buildError(code, fallback ?? message)
}
