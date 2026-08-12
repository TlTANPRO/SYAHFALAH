// lib/validation/field-limits.ts
// P2-1: Generic field validation helper.
// Bug #9 fix: title maxLength=500 prevents DoS and DB bloat.

import { apiError } from '@/lib/api/errors'

export interface FieldLimits {
  maxLength?: number
  minLength?: number
  pattern?: RegExp
  enum?: ReadonlyArray<string>
  required?: boolean
}

export const COMMON_LIMITS = {
  title: { maxLength: 500, minLength: 1, required: true },
  description: { maxLength: 5000 },
  notes: { maxLength: 2000 },
  name: { maxLength: 200, minLength: 1, required: true },
  email: { maxLength: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { maxLength: 30, pattern: /^[+\d\s()-]+$/ },
  code: { maxLength: 50, pattern: /^[A-Z0-9_-]+$/i },
  url: { maxLength: 2048 },
}

/**
 * Validate a single value against a FieldLimits spec.
 * Returns null if valid, or an error message string.
 */
export function validateField(field: string, value: unknown, limits: FieldLimits): string | null {
  // Required check
  if (limits.required && (value === undefined || value === null || value === '')) {
    return `${field} wajib diisi`
  }

  // Skip other checks if value is null/undefined and not required
  if (value === undefined || value === null) return null

  // Type-specific checks
  if (typeof value === 'string') {
    if (limits.minLength !== undefined && value.length < limits.minLength) {
      return `${field} minimal ${limits.minLength} karakter`
    }
    if (limits.maxLength !== undefined && value.length > limits.maxLength) {
      return `${field} maksimal ${limits.maxLength} karakter`
    }
    if (limits.pattern && !limits.pattern.test(value)) {
      return `${field} format tidak valid`
    }
  }

  if (limits.enum && !limits.enum.includes(String(value))) {
    return `${field} harus salah satu dari: ${limits.enum.join(', ')}`
  }

  return null
}

/**
 * Validate a request body against a record of field limits.
 * Returns null on success, or returns a NextResponse 400 with error message.
 */
export function validateBody<T extends Record<string, FieldLimits>>(
  body: Record<string, unknown>,
  schema: T
) {
  for (const [field, limits] of Object.entries(schema)) {
    const error = validateField(field, body[field], limits)
    if (error) return apiError.badRequest(error)
  }
  return null
}
