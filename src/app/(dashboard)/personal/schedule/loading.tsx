// app/(dashboard)/personal/schedule/loading.tsx
// Loading skeleton for personal schedule — 2 fetches
// (user id from JWT + tasks for current week).

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat jadwal">
      <div>
        <div className="h-8 w-44 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-56 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>

      {/* Daily rhythm section */}
      <div>
        <div className="h-5 w-32 bg-[var(--color-surface-2)]/60 rounded mb-3" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card">
              <div className="card-body p-3 flex items-center gap-3">
                <div className="h-10 w-12 bg-[var(--color-surface-2)]/60 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 bg-[var(--color-surface-2)]/60 rounded" />
                  <div className="h-3 w-20 bg-[var(--color-surface-2)]/40 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly rhythm section */}
      <div>
        <div className="h-5 w-36 bg-[var(--color-surface-2)]/60 rounded mb-3" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card">
              <div className="card-body p-3 flex items-center gap-3">
                <div className="h-8 w-16 bg-[var(--color-surface-2)]/60 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 bg-[var(--color-surface-2)]/60 rounded" />
                  <div className="h-3 w-24 bg-[var(--color-surface-2)]/40 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}