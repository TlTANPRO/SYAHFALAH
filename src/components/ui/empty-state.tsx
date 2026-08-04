// components/ui/empty-state.tsx
// Friendly empty-state placeholder. Used anywhere a query returns
// zero rows (a division with no KPIs, a team with no members, etc).
// Keeps pages from having to write the same "no data" boilerplate.

import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; href: string }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      {Icon && <Icon className="h-8 w-8 mx-auto text-muted-foreground mb-2" aria-hidden="true" />}
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
      {action && (
        <a
          href={action.href}
          className="inline-block mt-3 text-sm text-primary hover:underline"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
