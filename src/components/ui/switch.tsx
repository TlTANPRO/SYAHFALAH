// components/ui/switch.tsx
// Premium Switch component — adapted from 21st.dev id=21948 (serafimcloud).
// Sliding gradient track + spring-eased thumb (cubic-bezier .26 .75 .38 .45).
// Auto-save friendly: supports `checked` + `onCheckedChange`.
// Async states: loading (spinner in thumb), disabled (50% opacity).
//
// Size: sm (h-4 w-7) + default (h-5 w-9) — match shadcn convention.

'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role'> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  size?: 'sm' | 'default'
  loading?: boolean
  /** Optional accessible label override (otherwise inherits from aria-label/label) */
  label?: string
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch(
    {
      checked,
      onCheckedChange,
      size = 'default',
      loading = false,
      disabled = false,
      className,
      label,
      ...rest
    },
    ref,
  ) {
    // 21st.dev timing: 125ms off→on asymmetry, 250ms on→off
    const sizeClasses = {
      sm: 'h-4 w-7',
      default: 'h-5 w-9',
    }[size]

    const thumbSize = {
      sm: 'h-3 w-3',
      default: 'h-3.5 w-3.5',
    }[size]

    // Thumb translate distance: ~50% of width minus padding (1px)
    // 9px - 4px (h-3.5 * 2) - 2px = 3.5 twips for default
    const translateDistance = {
      sm: '3',
      default: '3.5',
    }[size]

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || rest['aria-label']}
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        data-state={checked ? 'checked' : 'unchecked'}
        data-slot="switch"
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          // Track
          'group relative inline-flex shrink-0 cursor-pointer appearance-none items-center',
          'rounded-full border-0 bg-transparent p-px',
          // Inset shadow + subtle base
          'shadow-[inset_0_0_0_1px_oklch(0_0_0/0.06),inset_0_1.5px_2px_oklch(0_0_0/0.08)]',
          // Gradient background (Brand blue when on, muted when off)
          'bg-[length:100px_100%] bg-no-repeat',
          // 21st.dev timing: cubic-bezier spring
          'transition-[background-position,box-shadow] duration-150 ease-[cubic-bezier(.26,.75,.38,.45)]',
          // Focus
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-500)]',
          // States
          'data-[state=checked]:bg-[var(--color-brand-500)] data-[state=unchecked]:bg-[var(--color-surface-3)]',
          // Disabled
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Position the gradient
          'data-[state=checked]:[background-position-x:0%] data-[state=unchecked]:[background-position-x:100%]',
          // Size
          sizeClasses,
          className,
        )}
        {...rest}
      >
        <span
          data-slot="switch-thumb"
          aria-hidden
          className={cn(
            'pointer-events-none flex items-center justify-center rounded-full',
            'bg-white shadow-[0_0_1px_1px_oklch(0_0_0/0.08),0_1px_1px_oklch(0_0_0/0.12),1px_2px_4px_-1px_oklch(0_0_0/0.18)]',
            // Position + translate animation
            'translate-x-0.5 transition-transform duration-150 ease-[cubic-bezier(.26,.75,.38,.45)]',
            `data-[state=checked]:translate-x-${translateDistance}`,
            // When checked: full thumb, when not: slightly smaller
            thumbSize,
            // Loading spinner
            loading && 'opacity-70',
          )}
        >
          {loading && <Loader2 className="h-2 w-2 animate-spin text-[var(--color-brand-500)]" />}
        </span>
      </button>
    )
  },
)
Switch.displayName = 'Switch'

/**
 * SwitchField — labeled switch with description, used in settings/forms.
 * Wraps Switch + label + description text in a clickable container.
 */
export interface SwitchFieldProps extends SwitchProps {
  label: string
  description?: string
  error?: string
}

export function SwitchField({
  label,
  description,
  error,
  ...switchProps
}: SwitchFieldProps) {
  const id = `switch-field-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-start justify-between gap-4 cursor-pointer p-3 rounded-md',
        'hover:bg-[var(--color-surface-2)]/50 transition-colors',
        switchProps.disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{description}</p>
        )}
        {error && (
          <p className="text-xs text-[var(--color-danger)] mt-1" role="alert">{error}</p>
        )}
      </div>
      <Switch id={id} {...switchProps} />
    </label>
  )
}
