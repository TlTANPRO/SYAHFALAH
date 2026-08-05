// app/(dashboard)/kpi/KpiExplorerClient.tsx
// Client wrapper for the KPI Explorer filter row + saved views.
// Persists current filter state to localStorage (via useSavedViews) and
// can apply saved snapshots via Link navigation.

'use client'

import Link from 'next/link'
import { Filter } from 'lucide-react'
import { useSavedViews } from '@/lib/hooks/useSavedViews'
import { SavedViewsBar } from '@/components/ui/SavedViewsBar'

interface Division { id: string; name: string }
interface Props {
  divisions: Division[]
  filterDivision: string | undefined
  filterLevel: string | undefined
  totalCount: number
  levelCounts: Record<string, number>
}

const LEVEL_LABEL: Record<string, string> = {
  company: 'Company',
  division: 'Divisi',
  personal: 'Personal',
}

function buildHref(level: string | undefined, division: string | undefined, current: { level?: string; division?: string }) {
  const params = new URLSearchParams()
  const nextLevel = level !== undefined ? level : current.level
  const nextDivision = division !== undefined ? division : current.division
  if (nextLevel) params.set('level', nextLevel)
  if (nextDivision) params.set('division', nextDivision)
  const qs = params.toString()
  return qs ? `/kpi?${qs}` : '/kpi'
}

export function KpiExplorerClient({ divisions, filterDivision, filterLevel, totalCount, levelCounts }: Props) {
  const { views, save, remove, hydrated } = useSavedViews('kpi-explorer')

  const currentState = { level: filterLevel, division: filterDivision }

  return (
    <>
      <SavedViewsBar
        scope="kpi-explorer"
        views={views}
        current={currentState}
        hydrated={hydrated}
        onSave={(label) => save(label, currentState)}
        onApply={(state) => {
          const params = new URLSearchParams()
          if (state.level) params.set('level', String(state.level))
          if (state.division) params.set('division', String(state.division))
          const qs = params.toString()
          window.location.href = qs ? `/kpi?${qs}` : '/kpi'
        }}
        onRemove={remove}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
          <Filter className="h-3 w-3" /> Filter
        </span>
        <Link
          href="/kpi"
          className={`pill ${!filterDivision && !filterLevel ? 'pill-active' : ''}`}
          data-variant={!filterDivision && !filterLevel ? 'brand' : 'neutral'}
        >
          Semua ({totalCount})
        </Link>
        <span className="text-[var(--color-text-tertiary)] text-xs">Level:</span>
        {(['company', 'division', 'personal'] as const).map(lv => {
          const count = levelCounts[lv] ?? 0
          const active = filterLevel === lv
          return (
            <Link
              key={lv}
              href={buildHref(lv, undefined, currentState)}
              className="pill"
              data-variant={active ? 'brand' : 'neutral'}
            >
              {LEVEL_LABEL[lv]} ({count})
            </Link>
          )
        })}
        {divisions.length > 0 && (
          <>
            <span className="text-[var(--color-text-tertiary)] text-xs">Divisi:</span>
            {divisions.map(d => {
              const active = filterDivision === d.id
              return (
                <Link
                  key={d.id}
                  href={buildHref(undefined, d.id, currentState)}
                  className="pill"
                  data-variant={active ? 'brand' : 'neutral'}
                >
                  {d.name}
                </Link>
              )
            })}
          </>
        )}
      </div>
    </>
  )
}