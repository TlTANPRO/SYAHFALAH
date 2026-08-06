// components/ui/tabs.tsx
// Lightweight SSR tabs. Each trigger is a Link to ?tab=X.
// Content shown/hidden via searchParams (server-side).
// No JS state — fully server-rendered.

import Link from 'next/link'

interface TabsProps {
  children: React.ReactNode
  className?: string
}

export function Tabs({ children, className }: TabsProps) {
  return <div className={className}>{children}</div>
}

interface TabsListProps {
  children: React.ReactNode
}

export function TabsList({ children }: TabsListProps) {
  return (
    <div className="flex gap-1 border-b border-[var(--color-border-subtle)] mb-4 overflow-x-auto scrollbar-thin">
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  active: boolean
  href: string
  children: React.ReactNode
}

export function TabsTrigger({ active, href, children }: TabsTriggerProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
        active
          ? 'border-[var(--color-brand-500)] text-[var(--color-brand-500)]'
          : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)]'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}

interface TabsContentProps {
  active: boolean
  children: React.ReactNode
}

export function TabsContent({ active, children }: TabsContentProps) {
  if (!active) return null
  return <div>{children}</div>
}
