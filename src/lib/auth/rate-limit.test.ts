// lib/auth/rate-limit.test.ts
// Small unit tests for the in-memory rate limiter. Verifies both the
// success path and the failure path.

import { describe, it, expect } from 'vitest'
import { checkRateLimit, resetRateLimit } from './rate-limit'

describe('rate-limit', () => {
  it('allows up to 5 attempts in a 1-minute window', () => {
    const id = 'test-1'
    resetRateLimit(id)
    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit(id)
      expect(r.allowed).toBe(true)
    }
    const sixth = checkRateLimit(id)
    expect(sixth.allowed).toBe(false)
    expect(sixth.retryAfterMs).toBeGreaterThan(0)
  })

  it('resets on success', () => {
    const id = 'test-2'
    resetRateLimit(id)
    for (let i = 0; i < 5; i++) checkRateLimit(id)
    expect(checkRateLimit(id).allowed).toBe(false)
    resetRateLimit(id)
    expect(checkRateLimit(id).allowed).toBe(true)
  })

  it('isolates identifiers', () => {
    resetRateLimit('test-3a')
    resetRateLimit('test-3b')
    for (let i = 0; i < 5; i++) checkRateLimit('test-3a')
    expect(checkRateLimit('test-3a').allowed).toBe(false)
    expect(checkRateLimit('test-3b').allowed).toBe(true)
  })
})
