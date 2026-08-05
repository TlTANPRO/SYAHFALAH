// (dashboard)/kepala-kantor/team — cards grid loading skeleton.
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat">
      <div>
        <div className="h-8 w-52 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-72 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card">
            <div className="card-body p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-[var(--color-surface-2)]/60 rounded" />
                <div className="h-4 w-4 bg-[var(--color-surface-2)]/60 rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-[var(--color-surface-2)]/40 rounded" />
                <div className="h-3 w-2/3 bg-[var(--color-surface-2)]/40 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
