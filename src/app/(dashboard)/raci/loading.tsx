// (dashboard)/raci — list-view loading skeleton (table-heavy).
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat">
      <div>
        <div className="h-8 w-44 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-64 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>
      <div className="card overflow-hidden">
        <div className="card-body">
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-3">
                <div className="h-4 bg-[var(--color-surface-2)]/60 rounded" />
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
