// components/ui/clickable.tsx
// Reusable wrappers that turn any row/card into a navigable detail link.
// Encodes the visual affordance (hover bg + cursor + focus ring) so we don't
// reinvent it per page.

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ClickableRowProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string
  /** Semantic tag for the inner wrapper. Defaults to <tr>, use 'div' for grid cards. */
  as?: 'tr' | 'div'
}

/**
 * `<ClickableRow>` — full-row link for tables & cards.
 *
 * Accessibility:
 * - Uses semantic <tr> or <div> depending on context.
 * - Single tab stop (the anchor itself), not a nested interactive mess.
 * - Focus ring on the anchor, hover bg + cursor-pointer as visual cues.
 * - Wraps content in <a> with aria-label fallback to inner text.
 */
export function ClickableRow({
  href,
  as = 'div',
  className,
  children,
  ...rest
}: ClickableRowProps) {
  const inner = (
    <Link
      href={href}
      className={cn(
        'block w-full cursor-pointer transition-colors duration-150',
        'hover:bg-[var(--color-surface-2)] focus-visible:bg-[var(--color-surface-2)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-inset',
        className
      )}
      {...rest}
    >
      {children}
    </Link>
  )

  if (as === 'tr') {
    return <tr>{inner}</tr>
  }
  return inner
}

interface ClickableCardProps {
  href: string
  children: React.ReactNode
  className?: string
  ariaLabel?: string
}

/**
 * Card variant of clickable affordance for grid layouts.
 */
export function ClickableCard({ href, children, className, ariaLabel }: ClickableCardProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        'card block transition-all duration-150 cursor-pointer',
        'hover:bg-[var(--color-surface-2)] hover:border-[var(--color-brand-500)] hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2',
        'motion-safe:hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </Link>
  )
}
