// components/ui/SelectableTable.tsx
// Generic selectable table wrapper. Adds a leading checkbox column
// when `selectable` is true. State lives in `selection` (Set of ids).
// Bulk actions rendered via BulkActionBar slot.

'use client'

import { Checkbox } from '@/components/ui/checkbox'
import type { ReactNode } from 'react'

interface Props<T> {
  rows: T[]
  getId: (row: T) => string | number
  selected: Set<string | number>
  onToggle: (id: string | number) => void
  onToggleAll: () => void
  isAllSelected: boolean
  bulkActionBar?: ReactNode
  children: (row: T, idx: number) => ReactNode
  emptyState?: ReactNode
  headerCells: { key: string; label: string; align?: 'left' | 'right' | 'center' }[]
}

export function SelectableTable<T>({
  rows,
  selected,
  onToggle,
  onToggleAll,
  isAllSelected,
  bulkActionBar,
  children,
  emptyState,
  headerCells,
    getId
  }: Props<T>) {
  return (
    <div>
      {bulkActionBar}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={onToggleAll}
                    aria-label="Pilih semua baris"
                  />
                </th>
                {headerCells.map(c => (
                  <th
                    key={c.key}
                    className={c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && emptyState ? (
                <tr>
                  <td colSpan={headerCells.length + 1} className="text-center py-8">
                    {emptyState}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const id = getId(row)
                  return (
                    <tr key={id} className={selected.has(id) ? 'bg-[var(--color-brand-500)]/5' : undefined}>
                      <td className="w-10">
                        <Checkbox
                          checked={selected.has(id)}
                          onCheckedChange={() => onToggle(id)}
                          aria-label={`Pilih baris ${idx + 1}`}
                        />
                      </td>
                      {children(row, idx)}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}