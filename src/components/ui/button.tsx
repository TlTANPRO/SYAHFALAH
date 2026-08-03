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
      primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary',
      secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 active:bg-secondary',
      outline: 'border border-border bg-transparent hover:bg-muted/50 active:bg-muted',
      ghost: 'bg-transparent hover:bg-muted/50 active:bg-muted',
      destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 active:bg-destructive',
      success: 'bg-success text-success-foreground shadow-xs hover:bg-success/90 active:bg-success',
      warning: 'bg-warning text-warning-foreground shadow-xs hover:bg-warning/90 active:bg-warning',
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
      icon: 'p-2',
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