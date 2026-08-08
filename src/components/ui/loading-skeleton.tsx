// components/ui/loading-skeleton.tsx
// Shimmer skeleton variants for loading state.
// Each variant matches a common page archetype.

import { cn } from '@/lib/utils'

interface BaseProps {
  className?: string
}

export function SkeletonText({ className, width = 'w-full' }: BaseProps & { width?: string }) {
  return <div className={cn('skeleton h-4', width, className)} aria-hidden="true" />
}

export function SkeletonHeading({ className }: BaseProps) {
  return (
    <div className={cn('skeleton h-7 w-1/3', className)} aria-hidden="true" />
  )
}

export function SkeletonKpiTile({ className }: BaseProps) {
  return (
    <div
      className={cn(
        'kpi-tile space-y-3',
        className
      )}
      aria-hidden="true"
    >
      <div className="skeleton h-3 w-24" />
      <div className="skeleton h-8 w-16" />
      <div className="skeleton h-3 w-32" />
    </div>
  )
}

export function SkeletonRow({ className }: BaseProps) {
  return (
    <div
      className={cn('flex items-center gap-4 py-3', className)}
      aria-hidden="true"
    >
      <div className="skeleton h-4 w-4 rounded-full" />
      <div className="skeleton h-4 flex-1" />
      <div className="skeleton h-4 w-24" />
    </div>
  )
}

export function SkeletonCard({ className }: BaseProps) {
  return (
    <div
      className={cn('card p-6 space-y-3', className)}
      aria-hidden="true"
    >
      <div className="skeleton h-4 w-1/3" />
      <div className="skeleton h-3 w-2/3" />
      <div className="skeleton h-3 w-1/2" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, className }: BaseProps & { rows?: number }) {
  return (
    <div className={cn('data-table', className)} aria-hidden="true">
      <div className="flex items-center gap-4 py-3 border-b border-[var(--color-border-subtle)]">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-3 flex-1" />
        <div className="skeleton h-3 w-24" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}

export function SkeletonHero({ className }: BaseProps) {
  return (
    <div
      className={cn('hero space-y-4', className)}
      aria-hidden="true"
    >
      <div className="skeleton h-3 w-32" />
      <div className="skeleton h-10 w-1/2" />
      <div className="skeleton h-4 w-2/3" />
    </div>
  )
}

export function SkeletonKpiGrid({ count = 4, className }: BaseProps & { count?: number }) {
  return (
    <div
      className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonKpiTile key={i} />
      ))}
    </div>
  )
}

export function SkeletonCardGrid({ count = 6, className }: BaseProps & { count?: number }) {
  return (
    <div
      className={cn('hub-grid', className)}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
