// (dashboard)/admin — generic loading skeleton for static page.
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat">
      <div>
        <div className="h-8 w-48 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-72 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>
      <div className="card">
        <div className="card-body p-6 space-y-4">
          <div className="h-4 w-32 bg-[var(--color-surface-2)]/60 rounded" />
          <div className="h-10 w-full bg-[var(--color-surface-2)]/40 rounded" />
          <div className="h-10 w-full bg-[var(--color-surface-2)]/40 rounded" />
          <div className="h-10 w-2/3 bg-[var(--color-surface-2)]/40 rounded" />
        </div>
      </div>
    </div>
  )
}
