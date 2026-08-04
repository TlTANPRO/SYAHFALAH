// components/owner/PipelineFunnel.tsx
// Sales funnel showing leads progression from new → closed.
// Each stage is a colored column with count and conversion %.

const STAGES = [
  { key: 'new',       label: 'New',       color: 'var(--color-stage-new)' },
  { key: 'contacted', label: 'Contacted', color: 'var(--color-stage-contacted)' },
  { key: 'survey',    label: 'Survey',    color: 'var(--color-stage-survey)' },
  { key: 'booking',   label: 'Booking',   color: 'var(--color-stage-sp3k)' },
  { key: 'sp3k',      label: 'SP3K',      color: 'var(--color-stage-sp3k)' },
  { key: 'closing',   label: 'Closing',   color: 'var(--color-stage-closing)' },
  { key: 'closed',    label: 'Closed',    color: 'var(--color-stage-closing)' },
  { key: 'batal',     label: 'Batal',     color: 'var(--color-stage-batal)' },
] as const

export function PipelineFunnel({ leadsByStage, totalLeads }: { leadsByStage: Record<string, number>; totalLeads: number }) {
  const maxCount = Math.max(...STAGES.map((s) => leadsByStage[s.key] || 0), 1)

  return (
    <div className="card">
      <div className="card-body">
        {totalLeads === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Belum ada leads. Lead akan masuk dari form marketing, Meta Ads, TikTok, dan walk-in.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {STAGES.map((s) => {
              const count = leadsByStage[s.key] || 0
              const heightPct = (count / maxCount) * 100
              return (
                <div key={s.key} className="flex flex-col items-center">
                  <div className="w-full h-32 flex items-end justify-center mb-2">
                    <div
                      className="w-full rounded-t transition-all duration-500"
                      style={{
                        height: `${Math.max(heightPct, 4)}%`,
                        backgroundColor: s.color,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <p className="font-mono text-lg font-bold tabular-nums">{count}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mt-0.5">
                    {s.label}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
