// app/(dashboard)/personal/sow/loading.tsx
// Loading skeleton for personal/sow — 3 sequential fetches
// (users.division_id, sow_tasks, divisions).

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat SOW">
      <div>
        <div className="h-8 w-48 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-64 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>

      {/* SOW tasks grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card">
            <div className="card-body p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 bg-[var(--color-surface-2)]/60 rounded" />
                <div className="h-5 w-14 bg-[var(--color-surface-2)]/60 rounded-full" />
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