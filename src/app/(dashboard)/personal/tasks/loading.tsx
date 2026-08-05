// app/(dashboard)/personal/tasks/loading.tsx
// Loading skeleton for personal tasks — client-side useQuery (so loading
// state is rare; this is fallback during initial JS hydration).

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat tugas">
      <div>
        <div className="h-8 w-44 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-56 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border-default)] pb-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-[var(--color-surface-2)]/60 rounded" />
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card">
            <div className="card-body flex items-start gap-3 p-4">
              <div className="h-5 w-5 bg-[var(--color-surface-2)]/60 rounded mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-[var(--color-surface-2)]/60 rounded" />
                <div className="h-3 w-1/2 bg-[var(--color-surface-2)]/40 rounded" />
              </div>
              <div className="h-6 w-16 bg-[var(--color-surface-2)]/60 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}