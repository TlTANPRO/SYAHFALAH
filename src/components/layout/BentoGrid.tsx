// components/layout/BentoGrid.tsx
// Bento Grid layout system for dashboard widgets

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface BentoGridProps {
  children: ReactNode
  className?: string
  columns?: 1 | 2 | 3 | 4 | 'auto'
  gap?: number
}

export function BentoGrid({
  children,
  className,
  columns = 'auto',
  gap = 4
}: BentoGridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    auto: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }
  // Use inline style for gap because Tailwind v4 JIT can't statically detect
  // dynamic class names like `gap-${gap}` — without this, gap classes were
  // silently dropped from the build.
  return (
    <div
      style={{ gap: `${gap * 0.25}rem` }}
      className={cn(
        'grid',
        columnClasses[columns],
        className
      )}
    >
      {children}
    </div>
  )
}

// Bento Card - individual widget container
interface BentoCardProps {
  children: ReactNode
  className?: string
  span?: {
    colStart?: number
    colEnd?: number
    rowStart?: number
    rowEnd?: number
  }
  accent?: boolean
  interactive?: boolean
  onClick?: () => void
}

export function BentoCard({ 
  children, 
  className, 
  span, 
  accent = false,
  interactive = false,
  onClick 
}: BentoCardProps) {
  const style = span ? {
    gridColumn: span.colStart && span.colEnd ? `${span.colStart} / ${span.colEnd}` : undefined,
    gridRow: span.rowStart && span.rowEnd ? `${span.rowStart} / ${span.rowEnd}` : undefined,
  } : undefined

  return (
    <div
      style={style as React.CSSProperties}
      className={cn(
        'relative rounded-xl border bg-card p-6 shadow-xs transition-all duration-200 ease-out-expo',
        accent && 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20',
        interactive && 'cursor-pointer hover:shadow-md hover:border-primary/30',
        className
      )}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive && onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      } : undefined}
    >
      {children}
    </div>
  )
}

// Section Label with numbering (TITAN V23 DNA)
interface SectionLabelProps {
  number: number
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function SectionLabel({ number, title, subtitle, action, className }: SectionLabelProps) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 mb-4', className)}>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-primary letter-spacing-wide">
          {number.toString().padStart(2, '0')}
        </span>
        <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </div>
    </div>
  )
}

// KPI Card Component
interface KPICardProps {
  label: string
  value: string | number
  target?: string | number
  progress?: number
  trend?: { value: number; label: string } | null
  status?: 'on_track' | 'at_risk' | 'off_track' | 'achieved'
  accent?: boolean
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function KPICard({ 
  label, 
  value, 
  target, 
  progress, 
  trend, 
  status = 'on_track',
  accent = false,
  icon,
  action,
  className 
}: KPICardProps) {
  const statusStyles = {
    on_track: 'bg-success/10 text-success border-success/20',
    at_risk: 'bg-warning/10 text-warning border-warning/20',
    off_track: 'bg-destructive/10 text-destructive border-destructive/20',
    achieved: 'bg-info/10 text-info border-info/20',
  }

  const statusLabels = {
    on_track: 'On Track',
    at_risk: 'At Risk',
    off_track: 'Off Track',
    achieved: 'Achieved',
  }

  return (
    <BentoCard accent={accent} className={className}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            {action && <span className="ml-auto">{action}</span>}
          </div>
          <div className="font-heading text-3xl font-bold text-foreground tabular-nums line-clamp-1">
            {value}
          </div>
          {target !== undefined && (
            <div className="mt-1 text-sm text-muted-foreground">
              Target: <span className="font-medium tabular-nums">{target}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            statusStyles[status]
          )}>
            {statusLabels[status]}
          </span>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend.value >= 0 ? 'text-success' : 'text-destructive'
            )}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </div>
          )}
          {progress !== undefined && (
            <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out-expo"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </BentoCard>
  )
}

// Chart Card Wrapper
interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  action?: ReactNode
  span?: BentoCardProps['span']
}

export function ChartCard({ title, subtitle, children, className, action, span }: ChartCardProps) {
  return (
    <BentoCard span={span} className={className}>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      </div>
      <div className="h-64">{children}</div>
    </BentoCard>
  )
}

// Table Card Wrapper
interface TableCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  action?: ReactNode
  span?: BentoCardProps['span']
  pagination?: ReactNode
}

export function TableCard({ title, subtitle, children, className, action, span, pagination }: TableCardProps) {
  return (
    <BentoCard span={span} className={className}>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      </div>
      <div className="overflow-x-auto">{children}</div>
      {pagination && <div className="mt-4 flex items-center justify-between">{pagination}</div>}
    </BentoCard>
  )
}