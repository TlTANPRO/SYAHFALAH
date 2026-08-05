// app/(dashboard)/admin/users/[id]/page.tsx
// User detail page — read-only view of profile + role + activity.
// Phase 1 Plan C Wave 1: consumes reporting_to_user_id, hire_date,
// skills, photo_url, date_of_birth columns added in supabase migration 013.

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import {
  User, Mail, Phone, Building2, ShieldCheck, Activity,
  Users, Calendar, Award, Cake, Camera,
} from 'lucide-react'
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

// Compute tenure (years + months) from hire_date — Indonesian-friendly.
function tenure(hire: string | null): string | null {
  if (!hire) return null
  const start = new Date(hire)
  if (Number.isNaN(start.getTime())) return null
  const now = new Date()
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months -= 1
  if (months < 0) return null
  if (months < 12) return `${months} bulan`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem === 0 ? `${years} tahun` : `${years} thn ${rem} bln`
}

// Mask date of birth as age only — minimizes PII surface.
function ageOf(dob: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age >= 0 ? age : null
}

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
      avatar_url, hire_date, skills, photo_url, date_of_birth,
      reporting_to_user_id, created_at, updated_at,
      division:divisions(id, name)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !user) notFound()

  // Fetch manager (reporting_to_user_id) only when present — null-safe.
  const manager = user.reporting_to_user_id
    ? await supabase
        .from('users')
        .select('id, full_name, role, avatar_url, position')
        .eq('id', user.reporting_to_user_id)
        .maybeSingle()
    : { data: null }

  // Count tasks assigned. Live schema uses user_id (not assignee_id).
  const { count: taskCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', id)

  const { count: doneCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', id)
    .in('status', ['completed', 'done'])

  const roleV = ROLE_VARIANT[user.role as keyof typeof ROLE_VARIANT] ?? 'outline'
  const roleL = ROLE_LABEL[user.role as keyof typeof ROLE_LABEL] ?? user.role

  const skills = Array.isArray(user.skills) ? user.skills.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) : []
  const hireTenure = tenure(user.hire_date)
  const age = ageOf(user.date_of_birth)

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
              src={user.photo_url ?? user.avatar_url}
              name={user.full_name}
              className="h-20 w-20 text-xl"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant={roleV}>{roleL}</Badge>
                <Badge variant={user.is_active ? 'success' : 'outline'}>
                  {user.is_active ? 'Aktif' : 'Non-aktif'}
                </Badge>
                {hireTenure && (
                  <Badge variant="outline">{hireTenure}</Badge>
                )}
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
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span className="text-[var(--color-text-secondary)]">Bergabung:</span>
              <span className="font-medium">
                {user.hire_date
                  ? new Date(user.hire_date).toLocaleDateString('id-ID')
                  : '—'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Cake className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span className="text-[var(--color-text-secondary)]">Usia:</span>
              <span className="font-medium">
                {age !== null ? `${age} tahun` : '—'}
              </span>
            </div>
            {user.photo_url && (
              <div className="flex items-center gap-3 text-sm">
                <Camera className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                <span className="text-[var(--color-text-secondary)]">Foto:</span>
                <span className="font-mono text-xs truncate max-w-[16rem]" title={user.photo_url}>
                  {user.photo_url}
                </span>
              </div>
            )}
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

      {/* Reporting chain + skills (Plan C Wave 1 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Reporting
            </CardTitle>
          </CardHeader>
          <CardContent>
            {manager?.data ? (
              <Link
                href={`/admin/users/${manager.data.id}`}
                className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <Avatar
                  src={manager.data.avatar_url}
                  name={manager.data.full_name}
                  className="h-10 w-10 text-sm"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {manager.data.full_name}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] truncate">
                    {manager.data.position ?? ROLE_LABEL[manager.data.role as keyof typeof ROLE_LABEL] ?? manager.data.role}
                  </div>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                Tidak ada atasan langsung.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4" /> Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, i) => (
                  <Badge key={`${s}-${i}`} variant="outline">{s}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                Belum ada skills tercatat.
              </p>
            )}
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
            <span className="text-[var(--color-text-secondary)]">Created</span>
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
