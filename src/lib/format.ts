// lib/format.ts
// Shared formatting helpers for KPI, currency, and progress display.
// Used by KPI Explorer, owner/kpi, KPI table, dashboard stats, etc.

const IDR_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const COMPACT_IDR_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const NUMBER_FORMATTER = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
})

/**
 * Format a KPI value according to its unit.
 * - '%': percent with 1 decimal
 * - 'Rp' / 'IDR': full currency with separator (small values) or
 *   compact notation (>= 1M).
 * - 'count': integer with thousand separator.
 * - 'hours': float with 1 decimal.
 * - null / undefined: em-dash placeholder.
 */
export function formatValue(v: number | null | undefined, unit: string | null | undefined): string {
  if (v == null) return '—'
  if (!unit) return v.toFixed(1)
  if (unit === '%') return `${v.toFixed(1)}%`
  if (unit === 'Rp' || unit === 'IDR') {
    if (Math.abs(v) >= 1_000_000) return COMPACT_IDR_FORMATTER.format(v)
    return IDR_FORMATTER.format(v)
  }
  if (unit === 'count') return NUMBER_FORMATTER.format(v)
  if (unit === 'hours') return `${v.toFixed(1)} jam`
  return `${v.toFixed(1)} ${unit}`
}

/**
 * Format a raw IDR currency (not a KPI value) with full separator.
 * Use for monetary fields that are NOT KPI values.
 */
export function formatIDR(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return IDR_FORMATTER.format(amount)
}

/**
 * Percent change with arrow + green/red color hint. Returns label only —
 * caller applies color via `text-[var(--color-success)]` etc.
 */
export function formatDelta(current: number, baseline: number): {
  label: string
  isPositive: boolean
  isNeutral: boolean
} {
  if (!baseline) return { label: '—', isPositive: false, isNeutral: true }
  const pct = ((current - baseline) / Math.abs(baseline)) * 100
  if (Math.abs(pct) < 0.5) return { label: '0%', isPositive: false, isNeutral: true }
  return {
    label: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
    isPositive: pct > 0,
    isNeutral: false,
  }
}

/**
 * Relative time in Indonesian — e.g. "5 menit lalu", "2 jam lalu",
 * "Kemarin", "3 hari lalu".
 */
export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  const now = Date.now()
  const diffMs = now - d.getTime()
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 1) return 'baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr} jam lalu`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay === 1) return 'Kemarin'
  if (diffDay < 7) return `${diffDay} hari lalu`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
