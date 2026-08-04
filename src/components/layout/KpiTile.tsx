// components/layout/KpiTile.tsx
// KPI tile card: code + name + progress bar + target vs actual.

const STATUS_VARIANT: Record<string, string> = {
  achieved: 'success',
  on_track: 'info',
  at_risk: 'warning',
  off_track: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  achieved: 'Tercapai',
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
}

interface KpiTileProps {
  code: string
  name: string
  target: string
  actual: string
  progress: number
  status: string
}

export function KpiTile({ code, name, target, actual, progress, status }: KpiTileProps) {
  const variant = STATUS_VARIANT[status] ?? 'neutral'
  const label = STATUS_LABEL[status] ?? status
  const pct = Math.min(100, Math.max(0, progress))
  return (
    <div className="card">
      <div className="card-body space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">{code}</p>
            <p className="font-medium mt-1 truncate">{name}</p>
          </div>
          <span className="pill" data-variant={variant}>{label}</span>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <p className="text-2xl font-heading font-bold tabular-nums">{actual}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] font-mono">target {target}</p>
        </div>

        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
          <div
            className="absolute inset-y-0 left-0 bg-[var(--color-brand-500)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
          <span className="font-mono">{pct.toFixed(0)}%</span>
          <span>progress</span>
        </div>
      </div>
    </div>
  )
}
