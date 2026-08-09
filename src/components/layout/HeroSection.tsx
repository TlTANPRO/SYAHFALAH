// components/layout/HeroSection.tsx
// Premium hero pattern used on 48 dashboard pages.
// Three variants: default (brand blue), aurum (premium), compact (no ribbon).
// Optional eyebrow, title, subtitle, status pills, CTA action.

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface HeroSectionProps {
  /** Title — the page's main heading. Use display-lg or display-xl class. */
  title?: ReactNode
  /** Subtitle — appears below title. */
  subtitle?: ReactNode
  /** Eyebrow — short label above title (e.g. "Ringkasan Owner · 8 Aug"). */
  eyebrow?: ReactNode
  /** Aurum-tinted eyebrow variant. */
  eyebrowVariant?: 'default' | 'aurum' | 'brand'
  /** Status pills — small inline indicators (e.g. Live · realtime). */
  pills?: ReactNode
  /** Right-aligned action component (e.g. Button group). */
  action?: ReactNode
  /** Variant — default is brand blue ribbon, aurum is premium gold. */
  variant?: 'default' | 'aurum' | 'compact' | 'dense'
  /** Sub-elements rendered below the main row but inside hero. */
  children?: ReactNode
  /** Custom className for the outer wrapper. */
  className?: string
}

export function HeroSection({
  title,
  subtitle,
  eyebrow,
  eyebrowVariant = 'brand',
  pills,
  action,
  variant = 'default',
  children,
  className,
}: HeroSectionProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center justify-between gap-4 flex-wrap', className)}>
        <div className="space-y-1">
          {eyebrow && (
            <p
              className={cn(
                'eyebrow',
                eyebrowVariant === 'aurum' && 'eyebrow-aurum',
                eyebrowVariant === 'brand' && 'eyebrow-brand'
              )}
            >
              {eyebrow}
            </p>
          )}
          {typeof title === 'string' ? (
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h1>
          ) : (
            title
          )}
          {subtitle && (
            <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>
    )
  }

  return (
    <section
      className={cn(
        'hero',
        variant === 'aurum' && 'hero-aurum',
        variant === 'dense' && 'hero-dense',
        className
      )}
    >
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          {eyebrow && (
            <p
              className={cn(
                'eyebrow',
                eyebrowVariant === 'aurum' && 'eyebrow-aurum',
                eyebrowVariant === 'brand' && 'eyebrow-brand'
              )}
            >
              {eyebrow}
            </p>
          )}
          {typeof title === 'string' ? (
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h1>
          ) : (
            title
          )}
          {subtitle && (
            <p className="text-sm text-[var(--color-text-secondary)] max-w-xl">{subtitle}</p>
          )}
        </div>
        {(pills || action) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {pills}
            {action}
          </div>
        )}
      </div>
      {children && <div className="relative z-10 mt-6">{children}</div>}
    </section>
  )
}
