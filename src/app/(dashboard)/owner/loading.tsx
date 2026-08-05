// app/(dashboard)/owner/loading.tsx
// Loading skeleton for owner — Executive Overview pulls 7 parallel queries
// (clusters, leads, projects, consumer_cases, team_personal_kpis,
// divisions, kpi trend). Skenya pindah ke Promise.all (commit 239c633).

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-8 w-48 bg-[var(--color-surface-2)] rounded" />
        <div className="h-4 w-72 bg-[var(--color-surface-2)]/60 rounded mt-2" />
      </div>

      {/* 4 stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card">
            <div className="card-body p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-3 w-20 bg-[var(--color-surface-2)]/60 rounded" />
                <div className="h-4 w-4 bg-[var(--color-surface-2)]/60 rounded" />
              </div>
              <div className="h-7 w-24 bg-[var(--color-surface-2)] rounded mt-1" />
              <div className="h-3 w-32 bg-[var(--color-surface-2)]/40 rounded mt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="card">
        <div className="card-body">
          <div className="h-5 w-40 bg-[var(--color-surface-2)] rounded mb-3" />
          <div className="h-[200px] bg-[var(--color-surface-2)]/40 rounded" />
        </div>
      </div>

      {/* Team KPI table */}
      <div className="card">
        <div className="card-body">
          <div className="h-5 w-40 bg-[var(--color-surface-2)] rounded mb-3" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-32 bg-[var(--color-surface-2)]/60 rounded" />
                <div className="h-4 flex-1 bg-[var(--color-surface-2)]/40 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
