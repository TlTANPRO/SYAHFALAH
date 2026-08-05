// components/ui/avatar.tsx
// User avatar with initials fallback when src is null/missing.

import * as React from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  className?: string
  /** Optional override for the initials derivation */
  size?: 'sm' | 'md' | 'lg'
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const SIZE_MAP = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-20 w-20 text-xl',
} as const

export function Avatar({ src, name, className, size = 'md' }: AvatarProps) {
  const initials = getInitials(name)

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          'rounded-full object-cover flex-shrink-0',
          SIZE_MAP[size],
          className
        )}
        loading="lazy"
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
        'bg-[var(--color-brand-500)]/15 text-[var(--color-brand-500)]',
        'select-none',
        SIZE_MAP[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
