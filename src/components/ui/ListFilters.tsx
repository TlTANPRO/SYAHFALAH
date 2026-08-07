// src/components/ui/ListFilters.tsx
// Reusable server-component list-page toolbar.
// Renders a search input (URL `q` param) + a row of pill-filter chips
// (each representing an enum or value filter via URL param).
//
// Usage pattern:
//   import { ListFilters, FilterChip } from '@/components/ui/ListFilters'
//
//   <ListFilters
//     searchPlaceholder="Cari leads..."
//     basePath="/owner/marketing"
//     chips={[
//       { label: 'Semua',     value: '',         active: !sp.stage },
//       { label: 'Baru',      value: 'new',      active: sp.stage === 'new' },
//       { label: 'Dihubungi', value: 'contacted',active: sp.stage === 'contacted' },
//       ...
//     ]}
//     extraParams={{ tab: sp.tab }}
//   />
//
// Renders a `<form method="GET">` for the search so it works without JS.

import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export interface FilterChip {
  label: string
  value: string
  active?: boolean
  count?: number
  /** Optional named URL param. Defaults to 'filter'. */
  param?: string
}

export interface ListFiltersProps {
  /** Placeholder text for the search input. */
  searchPlaceholder: string
  /** Base URL (used by chips to build links). */
  basePath: string
  /** Current search query (for input value). */
  searchValue?: string
  /** Other URL params to preserve when a chip is clicked (e.g. { tab: 'projects' }). */
  extraParams?: Record<string, string | undefined>
  /** Filter chips. Pass an empty array to skip the chip row. */
  chips?: FilterChip[]
  /** Name of the search URL param. Defaults to 'q'. */
  searchParam?: string
}

/**
 * Server-renderable toolbar: search input + filter chip row.
 * All links/hrefs preserve the `extraParams` so chips+tabs co-嵌套 nicely.
 */
export function ListFilters({
  searchPlaceholder,
  basePath,
  searchValue = '',
  extraParams = {},
  chips = [],
  searchParam = 'q',
}: ListFiltersProps) {
  // Helper: build URL with all current params + one override.
  function buildHref(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...extraParams, ...overrides })) {
      if (v !== undefined && v !== '' && v !== null) params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <form method="GET" action={basePath} className="flex items-center gap-2 flex-1">
        {/* Preserve extraParams as hidden inputs so chip filtering survives a search submit. */}
        {Object.entries(extraParams).map(([k, v]) => (
          v ? <input key={k} type="hidden" name={k} value={v} /> : null
        ))}
        <div className="relative flex-1 max-w-md">
          <Input
            id="list-filter-search"
            name={searchParam}
            type="search"
            placeholder={searchPlaceholder}
            defaultValue={searchValue}
            autoComplete="off"
            aria-label={searchPlaceholder}
            className="pl-9"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
        </div>
        <button
          type="submit"
          className="rounded-md border border-[var(--color-border-default)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-surface-2)]"
          aria-label="Cari"
        >
          Cari
        </button>
      </form>

      {chips.length > 0 && (
        <div role="group" aria-label="Filter" className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip, i) => {
            const paramName = chip.param ?? 'filter'
            const href = buildHref({ [paramName]: chip.value })
            const isActive = Boolean(chip.active)
            return (
              <a
                key={`${chip.value}-${i}`}
                href={href}
                className={`pill text-xs ${isActive ? 'bg-[var(--color-brand-500)] text-white' : ''}`}
                data-variant={isActive ? 'brand' : 'outline'}
                aria-pressed={isActive}
              >
                {chip.label}
                {typeof chip.count === 'number' && (
                  <span className="ml-1 opacity-70 font-mono">{chip.count}</span>
                )}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

