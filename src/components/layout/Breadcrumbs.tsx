// components/layout/Breadcrumbs.tsx
// Compact breadcrumb yang nampilin lokasi user sekarang.

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
      <Link href="/" className="inline-flex items-center gap-1 hover:text-[var(--color-text-secondary)] transition-colors">
        <Home className="h-3 w-3" />
        <span>Beranda</span>
      </Link>
      {crumbs.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ChevronRight className="h-3 w-3 opacity-50" />
          {c.href ? (
            <Link href={c.href} className="hover:text-[var(--color-text-secondary)] transition-colors">
              {c.label}
            </Link>
          ) : (
            <span className="text-[var(--color-text-secondary)] font-medium">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
