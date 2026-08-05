// components/ui/button.tsx
// Button component variants

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
    
    const variants = {
      primary: 'bg-[var(--color-brand-500)] text-primary-foreground shadow-xs hover:bg-[var(--color-brand-500)]/90 active:bg-[var(--color-brand-500)]',
      secondary: 'bg-[var(--color-surface-2)] text-secondary-foreground shadow-xs hover:bg-[var(--color-surface-2)]/80 active:bg-[var(--color-surface-2)]',
      outline: 'border border-[var(--color-border-default)] bg-transparent hover:bg-[var(--color-surface-2)]/50 active:bg-[var(--color-surface-2)]',
      ghost: 'bg-transparent hover:bg-[var(--color-surface-2)]/50 active:bg-[var(--color-surface-2)]',
      destructive: 'bg-[var(--color-danger)] text-destructive-foreground shadow-xs hover:bg-[var(--color-danger)]/90 active:bg-[var(--color-danger)]',
      success: 'bg-[var(--color-success)] text-success-foreground shadow-xs hover:bg-[var(--color-success)]/90 active:bg-[var(--color-success)]',
      warning: 'bg-[var(--color-warning)] text-warning-foreground shadow-xs hover:bg-[var(--color-warning)]/90 active:bg-[var(--color-warning)]',
    }
    
    const sizes = {
      sm: 'h-9 px-3 text-xs gap-1.5', // 36px — small only for dense tables/forms
      md: 'h-11 px-4 text-sm gap-2', // 44px ✓ a11y (WCAG 2.5.5 AAA)
      lg: 'h-12 px-6 text-base gap-2', // 48px ✓ a11y
      icon: 'h-11 w-11 p-0', // 44px × 44px ✓ a11y
    }

    return (
      <Comp
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], 'rounded-lg', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
        )}
        {children}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button }