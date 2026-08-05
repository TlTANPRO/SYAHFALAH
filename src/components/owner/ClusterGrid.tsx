// components/owner/ClusterGrid.tsx
// Property cluster grid — shows each active cluster with sell-through,
// units, and average price. Color-coded by progress.

import { Building2, MapPin, TrendingUp } from 'lucide-react'

interface Cluster {
  id: string
  code: string
  name: string
  location: string
  total_units: number
  units_sold: number
  average_price_rupiah: number
  launched_at: string
}

function formatRupiahShort(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} M`
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} jt`
  return String(n)
}

function colorForProgress(p: number): string {
  if (p >= 75) return 'bg-[var(--color-success)]'      // green
  if (p >= 50) return 'bg-[var(--color-info)]'         // blue
  if (p >= 30) return 'bg-[var(--color-warning)]'      // amber
  return 'bg-danger'                    // red
}

export function ClusterGrid({ clusters }: { clusters: Cluster[] }) {
  if (clusters.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-8 text-center">
        <Building2 className="h-8 w-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Belum ada cluster. Jalankan migration 011 supaya data cluster masuk.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {clusters.map((c) => {
        const progress = c.total_units > 0 ? Math.round((c.units_sold / c.total_units) * 100) : 0
        const barColor = colorForProgress(progress)
        return (
          <div key={c.id} className="card card-hover">
            <div className="card-body">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="cluster-badge">{c.code}</span>
                  <h3 className="font-heading text-base font-semibold mt-2 text-[var(--color-text-primary)]">
                    {c.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {c.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                    {progress}%
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">
                    sell-through
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden mb-3">
                <div
                  className={`h-full ${barColor} transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Total</p>
                  <p className="font-mono text-sm font-semibold tabular-nums">{c.total_units}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Terjual</p>
                  <p className="font-mono text-sm font-semibold tabular-nums text-[var(--color-success)]">
                    {c.units_sold}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Sisa</p>
                  <p className="font-mono text-sm font-semibold tabular-nums text-[var(--color-text-secondary)]">
                    {c.total_units - c.units_sold}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-tertiary)]">Avg price</span>
                <span className="font-mono text-xs font-semibold tabular-nums text-[var(--color-text-primary)]">
                  Rp {formatRupiahShort(c.average_price_rupiah)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
