// admin/users/page.tsx
// Owner-only user management. Server component fetches initial data,
// then hands off to <UserListClient> for search/filter/pagination.

import { createClient } from '@supabase/supabase-js'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Shield } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { UserListClient } from './UserListClient'

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
  if (!url || !key) return { users: [], divisions: [], total: 0 }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const [{ data: users, count }, { data: divisions }] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, phone, role, position, division_id, is_active', { count: 'exact' })
      .order('role', { ascending: true })
      .order('full_name', { ascending: true })
      .range(0, 24),
    supabase.from('divisions').select('id, name').order('name'),
  ])
  return {
    users: (users ?? []) as AdminUser[],
    divisions: (divisions ?? []) as Division[],
    total: count ?? 0,
  }
}

const roleLabels: Record<string, { label: string; variant: 'default' | 'success' | 'info' | 'warning' | 'destructive' }> = {
  owner: { label: 'Owner', variant: 'success' },
  kepala_kantor: { label: 'Kepala Kantor', variant: 'info' },
  pic_divisi: { label: 'PIC Divisi', variant: 'warning' },
  staff: { label: 'Staff', variant: 'default' },
}

export default async function Page() {
  const { users, divisions, total } = await loadData()

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Manajemen User' }]} />
        <h1 className="font-heading text-2xl font-bold">Manajemen User</h1>
        <p className="text-[var(--color-text-secondary)]">{total} user terdaftar · {divisions.length} divisi</p>
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

      <UserListClient divisions={divisions} initialData={users} total={total} />
    </div>
  )
}
