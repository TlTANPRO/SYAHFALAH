// app/(dashboard)/divisi/[divisionId]/loading.tsx
// Loading skeleton for division detail — 5 parallel useQuery calls
// (division meta, KPIs, team, leads, projects). Layout: hero + stats + tabs.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat data divisi">
      {/* Hero */}
      <div>
        <div className="h-8 w-48 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-72 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card">
            <div className="card-body p-4 space-y-2">
              <div className="h-3 w-20 bg-[var(--color-surface-2)]/60 rounded" />
              <div className="h-7 w-24 bg-[var(--color-surface-2)] rounded" />
              <div className="h-2 w-full bg-[var(--color-surface-2)]/40 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* KPI table */}
      <div className="card overflow-hidden">
        <div className="card-body">
          <div className="h-5 w-40 bg-[var(--color-surface-2)] rounded mb-3" />
          <div className="space-y-2">
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