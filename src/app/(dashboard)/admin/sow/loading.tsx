// app/(dashboard)/admin/sow/loading.tsx
// Loading skeleton for SOW admin — 2 parallel queries
// (sow_tasks + divisions).

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat SOW editor">
      <div>
        <div className="h-8 w-52 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-72 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-[var(--color-surface-2)]/60 rounded-full" />
        ))}
      </div>

      {/* SOW cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="card">
            <div className="card-body p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-[var(--color-surface-2)]/60 rounded" />
                <div className="flex gap-2">
                  <div className="h-5 w-14 bg-[var(--color-surface-2)]/60 rounded-full" />
                  <div className="h-5 w-14 bg-[var(--color-surface-2)]/60 rounded-full" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-[var(--color-surface-2)]/40 rounded" />
                <div className="h-3 w-4/5 bg-[var(--color-surface-2)]/40 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}