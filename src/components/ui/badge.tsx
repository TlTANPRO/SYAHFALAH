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
      default: 'bg-muted text-muted-foreground border border-border',
      success: 'bg-success/10 text-success border border-success/20',
      warning: 'bg-warning/10 text-warning border border-warning/20',
      destructive: 'bg-destructive/10 text-destructive border border-destructive/20',
      info: 'bg-info/10 text-info border border-info/20',
      outline: 'bg-transparent text-foreground border border-border',
      'on-track': 'bg-success/10 text-success border border-success/20',
      'at-risk': 'bg-warning/10 text-warning border border-warning/20',
      'off-track': 'bg-destructive/10 text-destructive border border-destructive/20',
      'achieved': 'bg-info/10 text-info border border-info/20',
      'priority-critical': 'bg-destructive/10 text-destructive border border-destructive/20',
      'priority-high': 'bg-warning/10 text-warning border border-warning/20',
      'priority-medium': 'bg-info/10 text-info border border-info/20',
      'priority-low': 'bg-muted text-muted-foreground border border-border',
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