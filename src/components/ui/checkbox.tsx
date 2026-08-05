// components/ui/checkbox.tsx
// Minimal accessible checkbox. Native <input type=checkbox> with custom
// visual, aria-label support, indeterminate state.

'use client'

import { forwardRef } from 'react'

interface CheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  'aria-label'?: string
  disabled?: boolean
  indeterminate?: boolean
  className?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ checked, onCheckedChange, disabled, indeterminate, className, ...rest }, ref) {
    const ariaLabel = rest['aria-label']
    return (
      <input
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminate
          if (typeof ref === 'function') ref(el)
          else if (ref) ref.current = el
        }}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        aria-label={ariaLabel}
        className={`h-4 w-4 rounded border border-[var(--color-border-default)] bg-[var(--color-surface-1)] text-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/30 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ''}`}
      />
    )
  }
)
Checkbox.displayName = 'Checkbox'
