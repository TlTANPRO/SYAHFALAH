// lib/utils.test.ts
// Unit tests for the null-safe formatters added in the last refactor.
// Run with `pnpm exec vitest run` (vitest was already hoisted by pnpm
// when lockfile was reinstalled).

import { describe, it, expect } from 'vitest'
import { formatPercent, formatCurrency, formatNumber } from './utils'

describe('formatPercent', () => {
  it('formats a regular number with 1 decimal and %', () => {
    expect(formatPercent(90.53958333333334)).toBe('90.5%')
  })
  it('respects the decimals argument', () => {
    expect(formatPercent(73, 0)).toBe('73%')
    expect(formatPercent(73.456, 2)).toBe('73.46%')
  })
  it('returns 0% for null', () => {
    expect(formatPercent(null)).toBe('0%')
  })
  it('returns 0% for undefined', () => {
    expect(formatPercent(undefined)).toBe('0%')
  })
  it('returns 0% for NaN', () => {
    expect(formatPercent(NaN)).toBe('0%')
  })
  it('handles 0', () => {
    expect(formatPercent(0)).toBe('0.0%')
  })
  it('handles 100', () => {
    expect(formatPercent(100)).toBe('100.0%')
  })
})

describe('formatCurrency', () => {
  it('formats IDR with id locale', () => {
    // 1500000 → "Rp 1.500.000" (Intl output)
    const out = formatCurrency(1_500_000)
    expect(out).toMatch(/1\.500\.000/)
    expect(out).toMatch(/Rp|IDR/)
  })
  it('returns dash for null', () => {
    expect(formatCurrency(null)).toBe('—')
  })
  it('returns dash for undefined', () => {
    expect(formatCurrency(undefined)).toBe('—')
  })
  it('returns dash for NaN', () => {
    expect(formatCurrency(NaN)).toBe('—')
  })
  it('handles 0', () => {
    expect(formatCurrency(0)).toMatch(/0|Rp|IDR/)
  })
})

describe('formatNumber', () => {
  it('formats with id locale thousands separator', () => {
    expect(formatNumber(1500000)).toBe('1.500.000')
  })
  it('returns dash for null', () => {
    expect(formatNumber(null)).toBe('—')
  })
  it('returns dash for undefined', () => {
    expect(formatNumber(undefined)).toBe('—')
  })
  it('returns dash for NaN', () => {
    expect(formatNumber(NaN)).toBe('—')
  })
})
