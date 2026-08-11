// components/ui/empty-state.tsx
// Actionable + educational + illustration empty-state.
// Used anywhere a query returns zero rows.
// Three archetypes: no-data, error, search-empty.

import type { LucideIcon } from 'lucide-react'
import type React from 'react'
import Link from 'next/link'
import { ArrowRight, SearchX, AlertTriangle } from 'lucide-react'

interface EmptyStateProps {
  /** Optional icon (top-left, not topper pattern). */
  icon?: LucideIcon
  /** Title — required, kept short. */
  title: string
  /** More detailed explanation. */
  description?: React.ReactNode
  /** Action — primary CTA. */
  action?:
    | { label: string; href: string; shortcut?: string }
    | { label: string; onClick: () => void; shortcut?: string }
  /** Secondary hint (e.g. "Tambah via menu Admin > X"). */
  hint?: React.ReactNode
  /** Variant — visual treatment. */
  variant?: 'no-data' | 'error' | 'search-empty' | 'compact'
  /** Optional eyebrow — small label above title. */
  eyebrow?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  hint,
  variant = 'no-data',
  eyebrow,
}: EmptyStateProps) {
  const isError = variant === 'error'
  const isSearch = variant === 'search-empty'

  // Default icon per variant
  const DefaultIcon = isError ? AlertTriangle : isSearch ? SearchX : Icon
  const eyebrowClass = isError
    ? 'eyebrow text-[var(--color-danger)]'
    : isSearch
    ? 'eyebrow text-[var(--color-text-tertiary)]'
    : 'eyebrow eyebrow-brand'

  const containerProps = {
    'aria-label': eyebrow || title,
  }

  const iconColor = isError
    ? 'text-[var(--color-danger)]'
    : isSearch
    ? 'text-[var(--color-text-tertiary)]'
    : 'text-[var(--color-brand-500)]'

  return (
    <div
      className={`rounded-xl border border-dashed ${
        isError
          ? 'border-[var(--color-danger)]/40'
          : 'border-[var(--color-border-default)]'
      } bg-[var(--color-surface-1)] p-8 text-left flex gap-4 items-start`}
      {...containerProps}
    >
      {DefaultIcon && (
        <div
          className={`h-10 w-10 rounded-md bg-[var(--color-surface-2)] flex items-center justify-center shrink-0 ${iconColor}`}
          aria-hidden="true"
        >
          <DefaultIcon className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-2">
        {eyebrow && <p className={eyebrowClass}>{eyebrow}</p>}
        <p className="font-heading text-base font-semibold text-[var(--color-text-primary)]">
          {title}
        </p>
        {description != null && (
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
            {description}
          </p>
        )}
        {hint && (
          <p className="text-xs text-[var(--color-text-tertiary)] font-mono bg-[var(--color-surface-2)] px-2 py-1 rounded inline-block mt-1">
            {hint}
          </p>
        )}
        {action && (
          <div className="pt-2 flex items-center gap-2">
            {'href' in action ? (
              <Link
                href={action.href}
                className="btn btn-sm"
                data-variant="primary"
                data-size="sm"
              >
                {action.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className="btn btn-sm"
                data-variant="primary"
                data-size="sm"
              >
                {action.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
            {action.shortcut && (
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] border border-[var(--color-border-default)]">
                {action.shortcut}
              </kbd>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
