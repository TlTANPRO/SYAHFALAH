// app/(dashboard)/admin/page.tsx
// Admin hub — only Owner role can access. Lists the management pages
// they have: User Management, Divisions, SOW Editor.

import Link from 'next/link'
import { ChevronRight, Users, Building2, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const links = [
  { href: '/admin/users',     icon: Users,     title: 'User Management', desc: 'Kelola akun, role, dan PIN' },
  { href: '/admin/divisions', icon: Building2, title: 'Divisions',       desc: 'Kelola divisi & PIC' },
  { href: '/admin/sow',       icon: FileText,  title: 'SOW Editor',      desc: 'Edit Scope of Work' },
]

export default function AdminHubPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Admin</h1>
        <p className="text-muted-foreground">Hanya Owner. Pilih menu untuk mengelola</p>
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
