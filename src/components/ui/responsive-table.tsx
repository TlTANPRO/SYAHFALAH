// src/components/ui/responsive-table.tsx
// Responsive table that shows as cards on mobile (sm: breakpoint).
// Uses a render-prop pattern: same data drives both table and card views.

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ResponsiveColumn<T> {
  /** Column key — must match property name */
  key: keyof T & string
  /** Display label */
  label: string
  /** Priority 1=high (always show), 2=medium (hide on mobile), 3=low (hide on mobile + tablet) */
  priority?: 1 | 2 | 3
  /** Custom cell renderer (returns ReactNode) */
  render?: (row: T) => React.ReactNode
  /** Text alignment */
  align?: 'left' | 'right' | 'center'
  /** Width class (e.g., 'w-32', 'w-1/4') */
  width?: string
}

interface Props<T> {
  /** Rows */
  rows: T[]
  /** Column definitions */
  columns: ResponsiveColumn<T>[]
  /** Unique key extractor */
  rowKey: (row: T) => string
  /** Row click handler (optional) */
  onRowClick?: (row: T) => void
  /** Loading state */
  loading?: boolean
  /** Empty state */
  emptyState?: React.ReactNode
  /** Custom className */
  className?: string
  /** First column gets priority 1 by default */
  firstColumnPriority?: 1 | 2 | 3
}

export function ResponsiveTable<T extends Record<string, unknown>>({
  rows,
  columns,
  rowKey,
  onRowClick,
  loading,
  emptyState,
  className,
  firstColumnPriority = 1,
}: Props<T>) {
  // Sort columns by priority (1 first)
  const sortedColumns = React.useMemo(() => {
    return [...columns].sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2))
  }, [columns])

  const isColumnVisible = (col: ResponsiveColumn<T>, breakpoint: 'mobile' | 'tablet' | 'desktop') => {
    const p = col.priority ?? 2
    if (breakpoint === 'desktop') return true
    if (breakpoint === 'tablet') return p <= 2
    if (breakpoint === 'mobile') return p === firstColumnPriority || p === 1
    return false
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-[var(--color-surface-2)] rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return <>{emptyState}</>
  }

  const renderCell = (row: T, col: ResponsiveColumn<T>) => {
    if (col.render) return col.render(row)
    const val = row[col.key]
    return val === null || val === undefined || val === '' ? '—' : String(val)
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile: card view (hidden on sm+) */}
      <div className="sm:hidden space-y-2">
        {rows.map((row) => {
          const key = rowKey(row)
          const cardCols = sortedColumns.filter((c) => isColumnVisible(c, 'mobile'))
          return (
            <div
              key={key}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'p-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-1)]',
                onRowClick && 'cursor-pointer hover:bg-[var(--color-surface-2)] active:bg-[var(--color-surface-3)]'
              )}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {cardCols.map((col) => (
                <div key={col.key} className="flex items-baseline gap-2 py-0.5">
                  <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] min-w-[80px] shrink-0">
                    {col.label}
                  </span>
                  <span className="text-sm flex-1 min-w-0 truncate">
                    {renderCell(row, col)}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Tablet+Desktop: table view (hidden on mobile) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-default)]">
              {sortedColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left p-3 font-medium text-[var(--color-text-secondary)]',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.width
                  )}
                  data-priority={col.priority ?? 2}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey(row)
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-[var(--color-border-subtle)]',
                    onRowClick && 'cursor-pointer hover:bg-[var(--color-surface-2)]'
                  )}
                >
                  {sortedColumns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'p-3',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        // Hide priority 3 on tablet (md:hidden equivalent via Tailwind arbitrary)
                        col.priority === 3 && 'hidden md:table-cell',
                        // Hide priority 2-3 on smaller tablet (lg: hidden for pri 2, default visible for pri 1)
                        col.priority === 2 && 'hidden lg:table-cell',
                      )}
                    >
                      {renderCell(row, col)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
