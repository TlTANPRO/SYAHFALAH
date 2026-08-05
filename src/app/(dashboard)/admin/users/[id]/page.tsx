// app/(dashboard)/admin/users/[id]/page.tsx
// User detail page — read-only view of profile + role + activity.

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { User, Mail, Phone, Building2, ShieldCheck, Activity } from 'lucide-react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/avatar'

interface PageProps {
  params: Promise<{ id: string }>
}

const ROLE_VARIANT = {
  owner: 'default',
  kepala_kantor: 'default',
  pic_divisi: 'info',
  staff: 'outline',
} as const

const ROLE_LABEL = {
  owner: 'Owner',
  kepala_kantor: 'Kepala Kantor',
  pic_divisi: 'PIC Divisi',
  staff: 'Staff',
} as const

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) notFound()

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id, full_name, email, phone, role, position, is_active,
      avatar_url, created_at, updated_at,
      division:divisions(id, name)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !user) notFound()

  // Count tasks assigned
  const { count: taskCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assignee_id', id)

  const { count: doneCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assignee_id', id)
    .in('status', ['completed', 'done'])

  const roleV = ROLE_VARIANT[user.role as keyof typeof ROLE_VARIANT] ?? 'outline'
  const roleL = ROLE_LABEL[user.role as keyof typeof ROLE_LABEL] ?? user.role

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'User', href: '/admin/users' },
        { label: user.full_name },
      ]} />

      {/* Header */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-start gap-4">
            <Avatar
              src={user.avatar_url}
              name={user.full_name}
              className="h-20 w-20 text-xl"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant={roleV}>{roleL}</Badge>
                <Badge variant={user.is_active ? 'success' : 'outline'}>
                  {user.is_active ? 'Aktif' : 'Non-aktif'}
                </Badge>
              </div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{user.full_name}</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">{user.position ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> Identitas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span className="text-[var(--color-text-secondary)]">Email:</span>
              <span className="font-medium">{user.email ?? '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span className="text-[var(--color-text-secondary)]">HP:</span>
              <span className="font-medium">{user.phone ?? '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Building2 className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span className="text-[var(--color-text-secondary)]">Divisi:</span>
              {(user.division as any)?.name ? (
                <Link
                  href={`/divisi/${(user.division as any).id}`}
                  className="font-medium text-[var(--color-brand-500)] hover:underline"
                >
                  {(user.division as any).name}
                </Link>
              ) : (
                <span className="font-medium text-[var(--color-text-muted)]">—</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Aktivitas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">Total task</span>
              <span className="text-2xl font-bold text-[var(--color-text-primary)]">{taskCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">Task selesai</span>
              <span className="text-2xl font-bold text-[var(--color-success)]">{doneCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">Completion rate</span>
              <span className="text-sm font-mono text-[var(--color-brand-500)]">
                {taskCount ? Math.round(((doneCount ?? 0) / taskCount) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Info Sistem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">User ID</span>
            <span className="font-mono text-xs">{user.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">Bergabung</span>
            <span>{user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : '—'}</span>
          </div>
          {user.updated_at && (
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Update terakhir</span>
              <span>{new Date(user.updated_at).toLocaleDateString('id-ID')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
