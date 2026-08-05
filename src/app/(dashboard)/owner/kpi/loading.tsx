// app/(dashboard)/owner/kpi/loading.tsx
// Loading skeleton for owner/kpi — 2 parallel queries (kpis, divisions).
// Layout: hero + filter pills + table.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat KPI owner">
      <div>
        <div className="h-8 w-52 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-64 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>

      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-[var(--color-surface-2)]/60 rounded-full" />
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="card-body">
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-3">
                <div className="h-4 bg-[var(--color-surface-2)]/60 rounded" />
                <div className="h-4 bg-[var(--color-surface-2)]/40 rounded" />
                <div className="h-4 bg-[var(--color-surface-2)]/40 rounded" />
                <div className="h-4 bg-[var(--color-surface-2)]/40 rounded" />
                <div className="h-4 bg-[var(--color-surface-2)]/40 rounded" />
                <div className="h-4 bg-[var(--color-surface-2)]/40 rounded" />
                <div className="h-4 bg-[var(--color-surface-2)]/40 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}