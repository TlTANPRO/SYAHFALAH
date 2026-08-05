// app/(dashboard)/admin/users/loading.tsx
// Loading skeleton for admin users — 2 parallel queries (users, divisions).
// Layout: hero + 4 role cards + table.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat manajemen user">
      <div>
        <div className="h-8 w-52 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-64 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card">
            <div className="card-body p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-[var(--color-surface-2)]/60 rounded" />
                <div className="h-3.5 w-3.5 bg-[var(--color-surface-2)]/60 rounded" />
              </div>
              <div className="h-7 w-16 bg-[var(--color-surface-2)] rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* User table */}
      <div className="card overflow-hidden">
        <div className="card-body">
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-3 items-center">
                <div className="h-4 bg-[var(--color-surface-2)]/60 rounded" />
                <div className="h-4 bg-[var(--color-surface-2)]/40 rounded" />
                <div className="h-5 w-20 bg-[var(--color-surface-2)]/60 rounded-full" />
                <div className="h-4 bg-[var(--color-surface-2)]/40 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}