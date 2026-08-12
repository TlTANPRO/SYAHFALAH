// components/ui/EntityList.tsx
// Composes the common list-page layout: HeroSection + ListFilters + children
// (table/cards) + Pagination + optional empty state. Use this to remove
// per-page layout duplication.
//
// Usage (client component):
//   const { data, total, isLoading } = useEntityList<Task>('tasks', params)
//   return (
//     <EntityList
//       hero={<HeroSection title="Tugas" ... />}
//       filters={{
//         basePath: '/personal/tasks',
//         placeholder: 'Cari tugas...',
//         chips: [...],
//         q, activeChip, setActiveChip, setQ,
//       }}
//       pagination={{
//         page, pageSize, total, onPageChange: setPage,
//       }}
//       isLoading={isLoading}
//       isEmpty={!isLoading && data.length === 0}
//       emptyState={<EntityEmptyState entity="tasks" />}
//     >
//       <TaskTable rows={data} />
//     </EntityList>
//   )

import type { ReactNode } from 'react'
import { ListFilters, type FilterChip } from './ListFilters'
import { Pagination } from './Pagination'
import { SkeletonRow } from './loading-skeleton'

export interface EntityListFilters {
  basePath: string
  placeholder: string
  searchValue?: string
  chips?: FilterChip[]
  searchParam?: string
  extraParams?: Record<string, string | undefined>
}

export interface EntityListPagination {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export interface EntityListProps {
  /** Hero/header section above filters. */
  hero?: ReactNode
  /** Filters: search input + chip row. */
  filters?: EntityListFilters
  /** When true, shows skeleton rows instead of children. */
  isLoading?: boolean
  /** Number of skeleton rows to show when loading. Default: 5 */
  skeletonRows?: number
  /** When true, shows the empty-state instead of children. */
  isEmpty?: boolean
  /** Optional empty-state element. Default: muted "Tidak ada data". */
  emptyState?: ReactNode
  /** Pagination state. Hidden if not provided. */
  pagination?: EntityListPagination
  /** Custom className for the outer wrapper. */
  className?: string
  /** Page content (table, cards, etc.) */
  children: ReactNode
}

/**
 * Composes the standard list-page layout: hero + filters + content + pagination.
 * Replaces the ~30-50 LOC of repeated layout boilerplate per list page.
 */
export function EntityList({
  hero,
  filters,
  isLoading = false,
  skeletonRows = 5,
  isEmpty = false,
  emptyState,
  pagination,
  className,
  children,
}: EntityListProps) {
  return (
    <div className={`flex flex-col gap-4 ${className ?? ''}`}>
      {hero}
      {filters && (
        <ListFilters
          searchPlaceholder={filters.placeholder}
          basePath={filters.basePath}
          searchValue={filters.searchValue}
          chips={filters.chips}
          searchParam={filters.searchParam}
          extraParams={filters.extraParams}
        />
      )}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : isEmpty ? (
        emptyState ?? (
          <div className="text-sm text-[var(--color-text-tertiary)] py-8 text-center">
            Tidak ada data
          </div>
        )
      ) : (
        children
      )}
      {pagination && <Pagination {...pagination} />}
    </div>
  )
}
