// lib/api/client-errors.ts
// Client-side error parsing + user-friendly error helpers.
// Parses fetch responses into a typed Error with code + message + hint
// matching the server-side { error: { code, message, severity, hint } } shape.

export type ApiErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface ApiErrorBody {
  code?: string
  message: string
  severity?: ApiErrorSeverity
  hint?: string
  /** Optional validation field errors */
  fields?: Record<string, string>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly severity: ApiErrorSeverity
  readonly hint?: string
  readonly fields?: Record<string, string>

  constructor(
    message: string,
    opts: { status: number; code?: string; severity?: ApiErrorSeverity; hint?: string; fields?: Record<string, string> }
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = opts.status
    this.code = opts.code ?? this.codeFromStatus(opts.status)
    this.severity = opts.severity ?? this.severityFromStatus(opts.status)
    this.hint = opts.hint
    this.fields = opts.fields
  }

  private codeFromStatus(status: number): string {
    if (status === 401) return 'UNAUTHENTICATED'
    if (status === 403) return 'FORBIDDEN'
    if (status === 404) return 'NOT_FOUND'
    if (status === 409) return 'CONFLICT'
    if (status === 422) return 'VALIDATION'
    if (status === 429) return 'RATE_LIMITED'
    if (status >= 500) return 'SERVER_ERROR'
    return 'BAD_REQUEST'
  }

  private severityFromStatus(status: number): ApiErrorSeverity {
    if (status === 401 || status === 403) return 'warning'
    if (status === 429) return 'warning'
    if (status >= 500) return 'critical'
    return 'error'
  }

  /** One-line user-facing message (Indonesian). */
  get displayMessage(): string {
    return this.message
  }
}

/**
 * Parse a fetch Response into a typed ApiError. Throws ApiError on non-2xx.
 * Safe to call with any Response — falls back to HTTP-only message on parse failure.
 */
export async function parseApiError(res: Response): Promise<ApiError> {
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // Non-JSON body
    return new ApiError(`HTTP ${res.status}`, { status: res.status })
  }

  if (body && typeof body === 'object' && 'error' in body) {
    const err = (body as { error: ApiErrorBody | string }).error
    if (typeof err === 'string') {
      return new ApiError(err, { status: res.status })
    }
    if (err && typeof err === 'object' && typeof err.message === 'string') {
      return new ApiError(err.message, {
        status: res.status,
        code: err.code,
        severity: err.severity,
        hint: err.hint,
        fields: err.fields,
      })
    }
  }
  // Fallback: { message } or { msg } shapes
  const fallback =
    (body && typeof body === 'object' && ('message' in body || 'msg' in body)
      ? String((body as Record<string, unknown>).message ?? (body as Record<string, unknown>).msg)
      : null) ?? `HTTP ${res.status}`
  return new ApiError(fallback, { status: res.status })
}

/**
 * Wrap a fetch call so non-2xx automatically throws a typed ApiError.
 * Use this when you want a single function for typed error handling.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (!res.ok) throw await parseApiError(res)
  return res
}

/** Indonesian-friendly fallback messages for common HTTP statuses. */
export const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'Permintaan tidak valid',
  401: 'Sesi habis. Silakan login ulang.',
  403: 'Anda tidak memiliki akses untuk aksi ini.',
  404: 'Data tidak ditemukan.',
  409: 'Data sudah ada atau konflik.',
  422: 'Data tidak lolos validasi.',
  429: 'Terlalu banyak permintaan. Coba lagi nanti.',
  500: 'Server error. Tim kami sudah menerima laporan.',
  503: 'Layanan sedang maintenance. Coba lagi nanti.',
}
