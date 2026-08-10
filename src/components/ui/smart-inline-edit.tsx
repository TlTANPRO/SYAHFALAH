// src/components/ui/smart-inline-edit.tsx
// InlineEdit wrapper with AI field suggestions popover.
// Shows autocomplete dropdown when entity+field+value context suggests options.

'use client'

import * as React from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { InlineEdit, type InlineEditType } from './inline-edit'
import { useFieldSuggestions } from '@/hooks/use-field-suggestions'
import { cn } from '@/lib/utils'

interface Props {
  /** Current value */
  value: string | number | null | undefined
  /** Save handler */
  onSave: (v: string | number) => Promise<void> | void
  /** Field type */
  type?: InlineEditType
  /** Entity name (e.g., 'tasks', 'projects') — enables AI suggestions */
  entity?: string
  /** Field name (e.g., 'status', 'priority') — required for suggestions */
  field?: string
  /** Options for select type (overrides AI suggestions) */
  options?: Array<{ value: string | number; label: string }>
  /** ARIA label */
  'aria-label'?: string
  /** Validation */
  validate?: (v: string | number) => string | null
  /** Custom className */
  className?: string
  /** Read-only */
  readOnly?: boolean
  /** Optional callback after save (receives old + new value) - for undo */
  onUndo?: (oldValue: string | number, newValue: string | number) => void
  /** Base row snapshot for conflict detection */
  baseRow?: Record<string, unknown> | null
  /** Conflict handler */
  onConflict?: (info: {
    serverRow: Record<string, unknown>
    baseRow: Record<string, unknown> | null
    draft: string | number
  }) => Promise<boolean> | boolean
}

export function SmartInlineEdit({
  value,
  onSave,
  type = 'text',
  entity,
  field,
  options,
  validate,
  className,
  readOnly,
  onUndo,
  baseRow,
  onConflict,
  'aria-label': ariaLabel,
}: Props) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState<string | number>(value ?? '')
  
  // Fetch AI suggestions when in edit mode
  const showSuggestions = editing && !!entity && !!field && !options
  const { suggestions, loading } = useFieldSuggestions({
    entity: entity ?? '',
    field: field ?? '',
    partial: String(draft),
    enabled: showSuggestions,
  })

  // Auto-lookup enum options from schema registry
  // Schema fields with kind='select' have options[] — use them
  const schemaOptions = React.useMemo(() => {
    if (options) return options
    if (!entity || !field) return undefined
    try {
      const { getSchema } = require('@/lib/schema/registry')
      const schema = getSchema(entity)
      const fieldDef = schema?.fields.find((f: { name: string }) => f.name === field)
      if (fieldDef?.kind === 'select' && fieldDef.options) {
        return fieldDef.options
      }
    } catch {
      // Schema not available, fall through
    }
    return undefined
  }, [options, entity, field])

  // If schema has options or AI provided suggestions, use as select
  const effectiveType = (schemaOptions || (suggestions.length > 0 && showSuggestions)) ? 'select' : type
  const effectiveOptions = schemaOptions ?? options ?? (
    suggestions.length > 0
      ? suggestions.map((s) => ({ value: s, label: s }))
      : undefined
  )

  return (
    <span className="relative inline-flex items-center gap-1">
      <InlineEdit
        value={value}
        onSave={onSave}
        type={effectiveType}
        options={effectiveOptions}
        validate={validate}
        aria-label={ariaLabel}
        className={className}
        readOnly={readOnly}
        onUndo={onUndo}
        baseRow={baseRow}
        onConflict={onConflict}
      />
      {showSuggestions && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider',
            'text-[var(--color-text-tertiary)] opacity-70'
          )}
          title={loading ? 'Memuat saran AI...' : `${suggestions.length} saran tersedia`}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : suggestions.length > 0 ? (
            <Sparkles className="h-3 w-3 text-[var(--color-brand-500)]" />
          ) : null}
        </span>
      )}
    </span>
  )
}
