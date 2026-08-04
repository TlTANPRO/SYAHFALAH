// components/ui/empty-state.tsx
// Friendly empty-state placeholder. Used anywhere a query returns
// zero rows (a division with no KPIs, a team with no members, etc).

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; href: string }
  hint?: string
}

export function EmptyState({ icon: Icon, title, description, action, hint }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-8 text-center">
      {Icon && <Icon className="h-8 w-8 mx-auto text-[var(--color-text-tertiary)] mb-2" aria-hidden="true" />}
      <p className="font-heading text-base font-semibold text-[var(--color-text-primary)]">{title}</p>
      {description && (
        <p className="text-sm text-[var(--color-text-secondary)] mt-1 max-w-md mx-auto">{description}</p>
      )}
      {hint && (
        <p className="text-xs text-[var(--color-text-tertiary)] mt-2 font-mono">{hint}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-[var(--color-brand-500)] hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </div>
  )
}
