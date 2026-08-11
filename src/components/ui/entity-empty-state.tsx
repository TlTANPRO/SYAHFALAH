// components/ui/entity-empty-state.tsx
// Drop-in replacement for EmptyState that auto-picks entity-specific copy.
// Usage: <EntityEmptyState entity="tasks" variant="noData" onActionClick={...} />

'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from './empty-state'
import { getEmptyStateCopy } from '@/lib/empty-state-copy'
import type { NoDataCopy } from '@/types/empty-state'

export interface EntityEmptyStateProps {
  /** Entity key from EMPTY_STATE_COPY map (e.g. 'tasks', 'leads', 'projects') */
  entity: string
  /** Archetype */
  variant?: 'noData' | 'searchEmpty' | 'error'
  /** Override copy */
  override?: {
    eyebrow?: string
    title?: string
    description?: string
  }
  /** Override action (e.g. custom handler for open dialog) */
  onAction?: () => void
  /** Optional icon */
  icon?: LucideIcon
  /** Filter context (e.g. 'cabang X' for empty filtered results) */
  filterContext?: string
}

const FALLBACK_COPY: NoDataCopy = {
  title: 'Belum ada data',
  action: { label: 'Buka QuickAdd', shortcut: 'Cmd+Shift+K' },
}

export function EntityEmptyState({
  entity,
  variant = 'noData',
  override,
  onAction,
  icon,
  filterContext,
}: EntityEmptyStateProps) {
  const copy = (getEmptyStateCopy(entity, variant) ?? FALLBACK_COPY) as NoDataCopy

  // Build effective copy with overrides + filter context
  const eyebrow = override?.eyebrow ?? copy.eyebrow
  let title = override?.title ?? copy.title
  let description = override?.description ?? copy.description
  if (filterContext && variant === 'searchEmpty') {
    description = `${description} (${filterContext})`
  }

  // Resolve action
  const actionLabel = copy.action?.label ?? 'Buka QuickAdd'
  const actionShortcut = copy.action?.shortcut ?? 'Cmd+Shift+K'
  const action = onAction
    ? { label: actionLabel, shortcut: actionShortcut, onClick: onAction }
    : copy.action?.href
      ? { label: actionLabel, shortcut: actionShortcut, href: copy.action.href }
      : undefined

  return (
    <EmptyState
      icon={icon}
      variant={variant === 'searchEmpty' ? 'search-empty' : variant === 'error' ? 'error' : 'no-data'}
      eyebrow={eyebrow}
      title={title}
      description={description}
      action={action}
    />
  )
}