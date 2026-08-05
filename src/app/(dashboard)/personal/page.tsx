// app/(dashboard)/personal/page.tsx
// Personal hub — entry point for any user. Redirects to the most useful
// default sub-route (My Tasks) and lists the rest as quick links.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, ListTodo, Target, BookOpen, Calendar, Bell } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const links = [
  { href: '/personal/tasks',          icon: ListTodo, title: 'Tugas Saya',     desc: 'Tugas harian & carry-over' },
  { href: '/personal/kpi',            icon: Target,   title: 'KPI Saya',       desc: 'KPI individu & progress' },
  { href: '/personal/sow',            icon: BookOpen, title: 'SOW Saya',       desc: 'Scope of Work pribadi' },
  { href: '/personal/schedule',       icon: Calendar, title: 'Jadwal Saya',    desc: 'Jadwal rutin & mingguan' },
  { href: '/personal/notifications',  icon: Bell,     title: 'Notifikasi',     desc: 'Briefing & alert' },
]

export default function PersonalHubPage() {
  // Personal hub — entry point for any user. Renders quick links to
  // sub-routes (Tugas Saya, KPI Saya, dll). Visitors who navigate here
  // directly see the hub rather than being auto-redirected, so
  // bookmarks and shared links land on a useful page.
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Personal</h1>
        <p className="text-[var(--color-text-secondary)]">Pilih salah satu untuk melihat data pribadimu</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="h-full hover:border-primary/40 hover:bg-[var(--color-surface-2)]/30 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <l.icon className="h-6 w-6 text-primary" />
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)]" />
                </div>
                <CardTitle className="mt-3">{l.title}</CardTitle>
                <CardDescription>{l.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
