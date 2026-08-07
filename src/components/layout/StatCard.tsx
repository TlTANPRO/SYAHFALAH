// components/layout/StatCard.tsx
// Stat tile: label + big value + optional hint + accent color.

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
}

export function StatCard({ label, value, hint, accent = 'neutral' }: StatCardProps) {
  return (
    <div className={`card ${ACCENT_BG[accent]}`}>
      <div className="card-body">
        <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">{label}</p>
        <p className={`mt-2 text-3xl font-heading font-bold tabular-nums ${ACCENT_TEXT[accent]}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{hint}</p>}
      </div>
    </div>
  )
}
