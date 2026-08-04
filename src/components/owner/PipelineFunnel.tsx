// components/owner/PipelineFunnel.tsx
// Visualisasi pipeline calon buyer. Atas: kolom per stage. Bawah: deretan
// mini-card per channel (Meta, TikTok, walk-in, referral) biar Owner
// bisa langsung lihat dari mana leadsnya datang.

const STAGES = [
  { key: 'new',       label: 'Baru',      color: 'var(--color-stage-new)' },
  { key: 'contacted', label: 'Dihubungi', color: 'var(--color-stage-contacted)' },
  { key: 'survey',    label: 'Survey',    color: 'var(--color-stage-survey)' },
  { key: 'booking',   label: 'Booking',   color: 'var(--color-stage-sp3k)' },
  { key: 'sp3k',      label: 'SP3K',      color: 'var(--color-stage-sp3k)' },
  { key: 'closing',   label: 'Akad',      color: 'var(--color-stage-closing)' },
  { key: 'closed',    label: 'Selesai',   color: 'var(--color-stage-closing)' },
  { key: 'batal',     label: 'Batal',     color: 'var(--color-stage-batal)' },
] as const

const SOURCE_LABEL: Record<string, string> = {
  meta_ads: 'Meta Ads',
  tiktok_ads: 'TikTok',
  organic: 'Organic',
  walk_in: 'Walk-in',
  referral: 'Referral',
  exhouse: 'Ex-house',
}

export function PipelineFunnel({ leadsByStage, totalLeads, leads }: {
  leadsByStage: Record<string, number>
  totalLeads: number
  leads?: any[]
}) {
  const maxCount = Math.max(...STAGES.map((s) => leadsByStage[s.key] || 0), 1)

  // Group by source
  const bySource: Record<string, number> = (leads ?? []).reduce((acc: any, l: any) => {
    acc[l.source] = (acc[l.source] || 0) + 1
    return acc
  }, {})
  const totalBySource = Object.values(bySource).reduce((s, n) => s + n, 0)

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body">
          {totalLeads === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Belum ada calon buyer. Leads masuk dari Meta Ads, TikTok, walk-in, dan referral.
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

      {/* Sumber leads */}
      {totalBySource > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Object.entries(bySource).map(([src, count]) => (
            <div key={src} className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-2">
              <p className="text-xs text-[var(--color-text-tertiary)]">{SOURCE_LABEL[src] || src}</p>
              <p className="font-mono text-base font-semibold tabular-nums">{count}</p>
              <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                {Math.round((count / totalBySource) * 100)}% dari total
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
