// components/layout/TopPageHero.tsx
// Hero banner untuk top-of-page. Brand color + heading + subheading + right slot.

import { ReactNode } from 'react'

interface TopPageHeroProps {
  title: string
  subtitle?: string
  rightSlot?: ReactNode
}

export function TopPageHero({ title, subtitle, rightSlot }: TopPageHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-lg border border-[var(--color-border-default)] bg-gradient-to-br from-[var(--color-surface-1)] to-[var(--color-surface-2)] p-6 md:p-8">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="display-xl truncate">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-base text-[var(--color-text-secondary)] max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
      </div>
    </header>
  )
}
