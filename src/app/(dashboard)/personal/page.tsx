// app/(dashboard)/personal/page.tsx
// Personal hub — entry point for any user. Redirects to the most useful
// default sub-route (My Tasks) and lists the rest as quick links.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, ListTodo, Target, BookOpen, Calendar, Bell } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const links = [
  { href: '/personal/tasks',          icon: ListTodo, title: 'My Tasks',        desc: 'Tugas harian & carry-over' },
  { href: '/personal/kpi',            icon: Target,   title: 'My KPIs',         desc: 'KPI individu & progress' },
  { href: '/personal/sow',            icon: BookOpen, title: 'My SOW',          desc: 'Scope of Work pribadi' },
  { href: '/personal/schedule',       icon: Calendar, title: 'My Schedule',     desc: 'Jadwal rutin & mingguan' },
  { href: '/personal/notifications',  icon: Bell,     title: 'Notifications',   desc: 'Briefing & alert' },
]

export default function PersonalHubPage() {
  // Convenience: visitors who land here without picking a sub-section
  // are most likely after their daily task list.
  // Keep the redirect client-friendly by sending to /personal/tasks
  // instead of rendering this page when navigated to directly.
  // (Server redirect from a route group is fine in App Router.)
  if (typeof window === 'undefined') {
    // SSR pass: render the hub (so the route is reachable from
    // bookmarks and links). The client redirect below kicks in only
    // after hydration if you really want — for now, the hub is the
    // canonical landing.
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Personal</h1>
        <p className="text-muted-foreground">Pilih salah satu untuk melihat data pribadimu</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="h-full hover:border-primary/40 hover:bg-muted/30 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <l.icon className="h-6 w-6 text-primary" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
