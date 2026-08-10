// src/components/ui/mobile-card-list.tsx
// Generic mobile card list renderer. Converts row data to compact cards.
// Each card supports inline edit + swipe gestures + tap for detail.

'use client'

import * as React from 'react'
import { ChevronRight, Edit3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { SwipeableRow } from '@/components/ui/swipeable-row'
import { cn } from '@/lib/utils'

export interface MobileCardField {
  /** Field key in row data */
  key: string
  /** Display label (shown as caption) */
  label: string
  /** Inline edit (if provided, value becomes editable) */
  editable?: boolean
  /** Field type for SmartInlineEdit */
  type?: 'text' | 'number' | 'date' | 'select'
  /** Entity name for AI suggestions */
  entity?: string
  /** Field name (for AI suggestions) */
  field?: string
  /** Custom render (e.g., badge) */
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
  /** Hide if this field is empty/null */
  hideIfEmpty?: boolean
  /** Priority 1 = show in card subtitle, 2 = show in body */
  priority?: 1 | 2
}

interface Props {
  rows: Array<Record<string, unknown>>
  fields: MobileCardField[]
  /** Card title field (always shown prominently) */
  titleField: string
  /** Row click handler */
  onRowClick?: (row: Record<string, unknown>) => void
  /** Save handler for inline edits */
  onSave?: (rowId: string, field: string, value: string | number) => Promise<void>
  /** Empty state */
  emptyState?: React.ReactNode
  /** Custom card className */
  className?: string
}

export function MobileCardList({
  rows,
  fields,
  titleField,
  onRowClick,
  onSave,
  emptyState,
  className,
}: Props) {
  if (rows.length === 0) {
    return <>{emptyState}</>
  }

  // Sort fields: priority 1 first
  const sortedFields = React.useMemo(
    () => [...fields].sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2)),
    [fields]
  )

  return (
    <div className={cn('sm:hidden space-y-2', className)}>
      {rows.map((row) => {
        const rowId = String(row.id ?? '')
        const titleValue = row[titleField]
        const titleFieldDef = fields.find((f) => f.key === titleField)
        
        return (
          <SwipeableRow
            key={rowId}
            rightAction={{
              id: 'edit',
              label: 'Edit',
              icon: Edit3,
              onTrigger: () => onRowClick?.(row),
            }}
            className="rounded-lg overflow-hidden border border-[var(--color-border-default)]"
          >
            <button
              type="button"
              onClick={() => onRowClick?.(row)}
              className="w-full text-left bg-[var(--color-surface-1)] p-3 space-y-2 active:bg-[var(--color-surface-2)] transition-colors"
              aria-label={`Buka detail ${String(titleValue ?? rowId)}`}
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {titleFieldDef?.editable && onSave ? (
                    <SmartInlineEdit
                      value={titleValue as string | number | null | undefined}
                      type={titleFieldDef.type ?? 'text'}
                      entity={titleFieldDef.entity}
                      field={titleFieldDef.field ?? titleField}
                      aria-label={`${titleFieldDef.label}`}
                      onSave={async (newValue) => {
                        await onSave(rowId, titleField, newValue)
                      }}
                      className="font-medium text-[var(--color-brand-500)]"
                    />
                  ) : (
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {String(titleValue ?? '—')}
                    </span>
                  )}
                  {/* Priority 1 fields (subtitle) */}
                  {sortedFields
                    .filter((f) => f.priority === 1 && f.key !== titleField)
                    .slice(0, 1)
                    .map((f) => {
                      const val = row[f.key]
                      if (f.hideIfEmpty && (val === null || val === undefined || val === '')) return null
                      return (
                        <p key={f.key} className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">
                          {f.render ? f.render(val, row) : String(val ?? '—')}
                        </p>
                      )
                    })}
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)] shrink-0 mt-1" />
              </div>
              
              {/* Priority 2 fields (body, badges, etc.) */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                {sortedFields
                  .filter((f) => (f.priority ?? 2) >= 2 && f.key !== titleField)
                  .slice(0, 4)
                  .map((f) => {
                    const val = row[f.key]
                    if (f.hideIfEmpty && (val === null || val === undefined || val === '')) return null
                    return (
                      <div key={f.key} className="contents">
                        {f.render ? (
                          f.render(val, row)
                        ) : (
                          <span className="text-[var(--color-text-secondary)]">
                            {f.label}: <span className="text-[var(--color-text-primary)]">{String(val ?? '—')}</span>
                          </span>
                        )}
                      </div>
                    )
                  })}
              </div>

              {/* Inline edit body fields (priority 2 with editable=true) */}
              {sortedFields
                .filter((f) => f.editable && f.key !== titleField && (f.priority ?? 2) >= 2)
                .slice(0, 2)
                .map((f) => {
                  const val = row[f.key]
                  if (f.hideIfEmpty && (val === null || val === undefined || val === '')) return null
                  return (
                    <div key={f.key} className="flex items-baseline gap-2 py-0.5">
                      <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] min-w-[80px] shrink-0">
                        {f.label}
                      </span>
                      <span className="text-sm flex-1 min-w-0">
                        {onSave ? (
                          <SmartInlineEdit
                            value={val as string | number | null | undefined}
                            type={f.type ?? 'text'}
                            entity={f.entity}
                            field={f.field ?? f.key}
                            aria-label={f.label}
                            onSave={async (newValue) => {
                              await onSave(rowId, f.key, newValue)
                            }}
                          />
                        ) : (
                          String(val ?? '—')
                        )}
                      </span>
                    </div>
                  )
                })}
            </button>
          </SwipeableRow>
        )
      })}
      <p className="text-xs text-[var(--color-text-tertiary)] text-center py-2">
        ← Geser untuk edit · Tap untuk detail →
      </p>
    </div>
  )
}
