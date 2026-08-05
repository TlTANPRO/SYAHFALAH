// app/(dashboard)/personal/notifications/loading.tsx
// Loading skeleton for personal notifications — 1 fetch (notifications
// filtered by user_id).

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat notifikasi">
      <div>
        <div className="h-8 w-48 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-64 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>

      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="card">
            <div className="card-body flex items-start gap-3 p-4">
              <div className="h-5 w-5 bg-[var(--color-surface-2)]/60 rounded mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-40 bg-[var(--color-surface-2)]/60 rounded" />
                  <div className="h-4 w-12 bg-[var(--color-surface-2)]/60 rounded-full" />
                </div>
                <div className="h-3 w-full bg-[var(--color-surface-2)]/40 rounded" />
                <div className="h-3 w-3/4 bg-[var(--color-surface-2)]/40 rounded" />
                <div className="h-2.5 w-24 bg-[var(--color-surface-2)]/40 rounded mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}