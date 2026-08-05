// components/ui/badge.tsx
// Badge component variants

import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline' | 'on-track' | 'at-risk' | 'off-track' | 'achieved' | 'priority-critical' | 'priority-high' | 'priority-medium' | 'priority-low'
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]',
      success: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20',
      warning: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20',
      destructive: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20',
      info: 'bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/20',
      outline: 'bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-default)]',
      'on-track': 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20',
      'at-risk': 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20',
      'off-track': 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20',
      'achieved': 'bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/20',
      'priority-critical': 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20',
      'priority-high': 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20',
      'priority-medium': 'bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/20',
      'priority-low': 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }