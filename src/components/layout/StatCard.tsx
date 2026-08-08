// components/layout/StatCard.tsx
// Stat tile: label + big value + optional hint + accent color.
// Optional icon (top-right) + trend indicator (delta with arrow).

import type { ReactNode } from 'react'

type Accent = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const ACCENT_BG: Record<Accent, string> = {
  brand: 'bg-[var(--color-brand-500)]/10',
  success: 'bg-[var(--color-verdigris-500)]/10',
  warning: 'bg-[var(--color-warning)]/10',
  danger: 'bg-[var(--color-danger)]/10',
  info: 'bg-[var(--color-info)]/10',
  neutral: 'bg-[var(--color-surface-2)]',
}

const ACCENT_TEXT: Record<Accent, string> = {
  brand: 'text-[var(--color-brand-500)]',
  success: 'text-[var(--color-verdigris-500)]',
  warning: 'text-[var(--color-warning)]',
  danger: 'text-[var(--color-danger)]',
  info: 'text-[var(--color-info)]',
  neutral: 'text-[var(--color-text-primary)]',
}

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  accent?: Accent
  /** Optional icon — rendered top-right in a small chip. */
  icon?: ReactNode
  /** Trend indicator — e.g. { value: '+12%', direction: 'up' }. */
  trend?: { value: string; direction: 'up' | 'down' | 'flat' }
}

export function StatCard({ label, value, hint, accent = 'neutral', icon, trend }: StatCardProps) {
  return (
    <div className={`card ${ACCENT_BG[accent]} relative overflow-hidden`}>
      <div className="card-body">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
            {label}
          </p>
          {icon && (
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded ${ACCENT_BG[accent] || 'bg-[var(--color-surface-2)]'} ${ACCENT_TEXT[accent]}`}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
        </div>
        <p className={`mt-2 text-3xl font-heading font-bold tabular-nums ${ACCENT_TEXT[accent]}`}>
          {value}
        </p>
        {(hint || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={
                  trend.direction === 'up'
                    ? 'text-[var(--color-verdigris-500)]'
                    : trend.direction === 'down'
                    ? 'text-[var(--color-danger)]'
                    : 'text-[var(--color-text-tertiary)]'
                }
              >
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
              </span>
            )}
            {hint && <span className="text-[var(--color-text-tertiary)]">{hint}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
