// components/layout/PageHeader.tsx
// Compact header for pages that don't need a full hero.
// Used on list pages, detail pages, settings, etc.

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  /** Eyebrow label above title. */
  eyebrow?: ReactNode
  /** Title — let consumer pass the heading class. */
  title: ReactNode
  /** Subtitle below title. */
  subtitle?: ReactNode
  /** Right-aligned action area (buttons, search, etc.). */
  actions?: ReactNode
  /** Optional Breadcrumbs slot. */
  breadcrumbs?: ReactNode
  /** Compact mode — smaller padding. */
  compact?: boolean
  /** Border at bottom. */
  bordered?: boolean
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  breadcrumbs,
  compact,
  bordered,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4',
        compact ? 'pb-4' : 'pb-6',
        bordered && 'border-b border-[var(--color-border-subtle)]',
        className
      )}
    >
      {breadcrumbs && <div>{breadcrumbs}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          {eyebrow && <p className="eyebrow eyebrow-brand">{eyebrow}</p>}
          {title}
          {subtitle && (
            <p className="text-sm text-[var(--color-text-secondary)] max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  )
}
