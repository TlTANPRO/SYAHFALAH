// app/(dashboard)/personal/page.tsx
// Personal hub — entry point for any user. Surfacing today's priority
// (a single "today's tasks" link) as the headline plus secondary links
// below. Visitors who navigate here directly see useful content, not a
// feature tile grid.

import Link from 'next/link'
import {
  ListTodo,
  Target,
  BookOpen,
  Calendar,
  Bell,
  ArrowRight,
  Activity,
} from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

type Tile = {
  href: string
  icon: typeof ListTodo
  title: string
  desc: string
  meta?: string
  priority?: boolean
}

const tiles: Tile[] = [
  {
    href: '/personal/tasks',
    icon: ListTodo,
    title: 'Tugas saya',
    desc: 'Tugas harian & carry-over',
    meta: 'Hari ini',
    priority: true,
  },
  {
    href: '/personal/kpi',
    icon: Target,
    title: 'KPI saya',
    desc: 'KPI individu & progress',
  },
  {
    href: '/personal/sow',
    icon: BookOpen,
    title: 'SOW saya',
    desc: 'Scope of Work pribadi',
  },
  {
    href: '/personal/schedule',
    icon: Calendar,
    title: 'Jadwal saya',
    desc: 'Jadwal rutin & mingguan',
  },
  {
    href: '/personal/notifications',
    icon: Bell,
    title: 'Notifikasi',
    desc: 'Briefing & alert',
  },
]

export default function PersonalHubPage() {
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const priority = tiles.find(t => t.priority)
  const others = tiles.filter(t => !t.priority)

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: 'Personal' }]} />

      {/* Hero — the personal operating summary */}
      <section className="hero">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="eyebrow eyebrow-brand">Personal · {today}</p>
            <h1 className="display-lg">Selamat bekerja.</h1>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
              Pilih aktivitas di bawah. Halaman ini bisa di-bookmark dan
              dishare — tidak ada redirect otomatis.
            </p>
          </div>
          {priority && (
            <Link
              href={priority.href}
              className="hub-card hub-card-priority group flex items-center gap-3 !p-4"
              aria-label={`Buka ${priority.title}`}
            >
              <priority.icon
                className="h-5 w-5 text-[var(--color-aurum-500)]"
                aria-hidden
              />
              <div className="flex-1">
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--color-aurum-500)]">
                  Hari ini
                </p>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {priority.title}
                </p>
              </div>
              <ArrowRight
                className="h-4 w-4 text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          )}
        </div>
      </section>

      {/* Secondary links — calm grid, no equal-weight feature tile */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Aktivitas</p>
            <h2 className="display-sm mt-1">Lainnya</h2>
          </div>
        </div>
        <ul className="hub-grid stagger-item list-none p-0" role="list">
          {others.map(({ href, icon: Icon, title, desc }) => (
            <li key={href}>
              <Link
                href={href}
                className="hub-card group flex items-start gap-3"
                aria-label={`${title} — ${desc}`}
              >
                <Activity
                  className="h-4 w-4 text-[var(--color-text-tertiary)] mt-0.5 transition-colors group-hover:text-[var(--color-brand-500)]"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {title}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                    {desc}
                  </p>
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] mt-1 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
