// app/(dashboard)/admin/page.tsx
// Admin hub — only Owner role can access. Curated management pages
// with a single guardrail "Akses Owner" badge instead of "Hanya Owner"
// sentence so the role is visible at a glance.

import Link from 'next/link'
import {
  Users,
  Building2,
  FileText,
  ArrowRight,
  Shield,
} from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

const tiles = [
  { href: '/admin/users', icon: Users, title: 'User management', desc: 'Kelola akun, role, dan PIN' },
  { href: '/admin/divisions', icon: Building2, title: 'Divisions', desc: 'Kelola divisi & PIC' },
  { href: '/admin/sow', icon: FileText, title: 'SOW editor', desc: 'Edit Scope of Work' },
] as const

export default function AdminHubPage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: 'Admin' }]} />

      <section className="hero">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="eyebrow eyebrow-aurum">
              <Shield className="inline h-3 w-3 mr-1" aria-hidden /> Akses Owner
            </p>
            <h1 className="display-lg">Admin</h1>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
              Halaman pengaturan. Perubahan di sini akan langsung berlaku
              untuk seluruh organisasi.
            </p>
          </div>
          <span className="pill" data-variant="aurum">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--color-aurum-500)]"
              aria-hidden
            />
            Mode Owner
          </span>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Pengaturan</p>
          <h2 className="display-sm mt-1">Pilih menu</h2>
        </div>
        <ul className="hub-grid stagger-item list-none p-0" role="list">
          {tiles.map(({ href, icon: Icon, title, desc }) => (
            <li key={href}>
              <Link
                href={href}
                className="hub-card group flex items-start gap-3"
                aria-label={`${title} — ${desc}`}
              >
                <Icon
                  className="h-4 w-4 text-[var(--color-text-tertiary)] mt-0.5 transition-colors group-hover:text-[var(--color-aurum-500)]"
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
