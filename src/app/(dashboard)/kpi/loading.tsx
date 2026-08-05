// app/(dashboard)/kpi/loading.tsx
// Loading skeleton for /kpi explorer — group-by-code query.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-44 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-64 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-[var(--color-surface-2)]/60 rounded-full" />
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="card-body">
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-3">
                <div className="h-4 bg-[var(--color-surface-2)]/60 rounded" />
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
