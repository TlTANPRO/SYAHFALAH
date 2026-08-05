// admin/users/page.tsx
// Owner-only user management. Reads from the users table via the
// service-role client (admin route). Mutation is not exposed yet —
// once we add an `/api/admin/users/[id]/role` endpoint, this page can
// wire up the role selector.

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Shield, Mail, Phone, ChevronRight } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

interface AdminUser {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  role: string
  position: string | null
  division_id: string | null
  is_active: boolean
}

interface Division {
  id: string
  name: string
}

async function loadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { users: [], divisions: [] }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const [{ data: users }, { data: divisions }] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, phone, role, position, division_id, is_active')
      .order('role', { ascending: true })
      .order('full_name', { ascending: true }),
    supabase.from('divisions').select('id, name').order('name'),
  ])
  return {
    users: (users ?? []) as AdminUser[],
    divisions: (divisions ?? []) as Division[],
  }
}

const roleLabels: Record<string, { label: string; variant: 'default' | 'success' | 'info' | 'warning' | 'destructive' }> = {
  owner: { label: 'Owner', variant: 'success' },
  kepala_kantor: { label: 'Kepala Kantor', variant: 'info' },
  pic_divisi: { label: 'PIC Divisi', variant: 'warning' },
  staff: { label: 'Staff', variant: 'default' },
}

export default async function Page() {
  const { users, divisions } = await loadData()
  const divName = new Map(divisions.map(d => [d.id, d.name]))

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
      <Breadcrumbs crumbs={ [{ label: 'Admin', href: '/admin' }, { label: 'Manajemen User' }] } />
        
        <h1 className="font-heading text-2xl font-bold">Manajemen User</h1>
        <p className="text-[var(--color-text-secondary)]">{users.length} user terdaftar · {divisions.length} divisi</p>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(roleLabels).map(([role, { label }]) => (
          <Card key={role}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-1">
                <Shield className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">{label}</span>
              </div>
              <div className="font-heading text-2xl font-bold tabular-nums">{roleCounts[role] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Daftar User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)]">
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Nama</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Role</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Divisi</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Kontak</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const r = roleLabels[u.role] || { label: u.role, variant: 'default' as const }
                  return (
                    <tr key={u.id} className="border-b border-[var(--color-border-default)]/50 hover:bg-[var(--color-surface-2)]/50 transition-colors">
                      <td className="p-3">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="block group"
                          aria-label={`Buka detail ${u.full_name}`}
                        >
                          <div className="font-medium text-[var(--color-brand-500)] group-hover:underline inline-flex items-center gap-1">
                            {u.full_name}
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)]">{u.position || '—'}</div>
                        </Link>
                      </td>
                      <td className="p-3">
                        <Badge variant={r.variant}>{r.label}</Badge>
                      </td>
                      <td className="p-3 text-[var(--color-text-secondary)]">
                        {u.division_id ? divName.get(u.division_id) || '—' : '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5 text-xs text-[var(--color-text-secondary)]">
                          {u.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {u.email}
                            </span>
                          )}
                          {u.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {u.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={u.is_active ? 'success' : 'outline'}>
                          {u.is_active ? 'Aktif' : 'Non-aktif'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
