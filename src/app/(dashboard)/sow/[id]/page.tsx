// app/(dashboard)/sow/[id]/page.tsx
// SOW (Scope of Work) task detail page.
// Click-through target for: admin/sow, sow, raci, personal/sow, owner/reports.

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Calendar, Clock, Flag, User, Building2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

const STATUS_VARIANT = {
  not_started: 'outline',
  in_progress: 'default',
  completed: 'success',
  blocked: 'destructive',
  cancelled: 'outline',
} as const

const PRIORITY_VARIANT = {
  low: 'outline',
  medium: 'default',
  high: 'warning',
  critical: 'destructive',
} as const

const STATUS_LABEL = {
  not_started: 'Belum mulai',
  in_progress: 'Berjalan',
  completed: 'Selesai',
  blocked: 'Terblokir',
  cancelled: 'Dibatalkan',
} as const

export default async function SowDetailPage({ params }: PageProps) {
  const { id } = await params

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) notFound()

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: sow, error } = await supabase
    .from('sow_tasks')
    .select(`
      id, code, title, description, priority, status,
      start_date, end_date, estimated_hours, actual_hours, progress,
      dependencies, tags, created_at, updated_at,
      division:divisions(id, name),
      pic:users!sow_tasks_pic_user_id_fkey(id, full_name, role)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !sow) notFound()

  // Fetch child tasks (sow_id == sow.id)
  const { data: childTasks } = await supabase
    .from('sow_with_tasks')
    .select('id, code, title, status, priority, progress')
    .eq('sow_id', id)
    .order('created_at', { ascending: true })

  const statusV = STATUS_VARIANT[sow.status as keyof typeof STATUS_VARIANT] ?? 'outline'
  const priorityV = PRIORITY_VARIANT[sow.priority as keyof typeof PRIORITY_VARIANT] ?? 'outline'
  const statusL = STATUS_LABEL[sow.status as keyof typeof STATUS_LABEL] ?? sow.status

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[
        { label: 'SOW', href: '/sow' },
        { label: sow.code },
      ]} />

      {/* Header */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-[var(--color-text-tertiary)]">{sow.code}</span>
                <Badge variant={statusV}>{statusL}</Badge>
                <Badge variant={priorityV}>{sow.priority}</Badge>
              </div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{sow.title}</h1>
              {sow.description && (
                <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-3xl">{sow.description}</p>
              )}
            </div>
            <div className="text-right text-sm text-[var(--color-text-secondary)]">
              <div className="text-xs">Progress</div>
              <div className="text-3xl font-bold text-[var(--color-brand-500)]">{sow.progress ?? 0}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] mb-1">
              <Building2 className="h-3 w-3" /> Divisi
            </div>
            {(sow.division as any)?.name ? (
              <Link
                href={`/divisi/${(sow.division as any).id}`}
                className="text-sm font-medium text-[var(--color-brand-500)] hover:underline"
              >
                {(sow.division as any).name}
              </Link>
            ) : (
              <div className="text-sm text-[var(--color-text-muted)]">—</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] mb-1">
              <User className="h-3 w-3" /> PIC
            </div>
            {(sow.pic as any)?.full_name ? (
              <Link
                href={`/admin/users/${(sow.pic as any).id}`}
                className="text-sm font-medium text-[var(--color-brand-500)] hover:underline"
              >
                {(sow.pic as any).full_name}
              </Link>
            ) : (
              <div className="text-sm text-[var(--color-text-muted)]">—</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] mb-1">
              <Calendar className="h-3 w-3" /> Periode
            </div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">
              {sow.start_date ? new Date(sow.start_date).toLocaleDateString('id-ID') : '—'}
              {' → '}
              {sow.end_date ? new Date(sow.end_date).toLocaleDateString('id-ID') : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] mb-1">
              <Clock className="h-3 w-3" /> Jam Kerja
            </div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">
              <span className="text-[var(--color-text-secondary)]">est.</span> {sow.estimated_hours ?? 0}h
              <span className="text-[var(--color-text-secondary)] ml-2">aktual</span>{' '}
              <span className={sow.actual_hours > (sow.estimated_hours ?? 0) ? 'text-[var(--color-danger)]' : ''}>
                {sow.actual_hours ?? 0}h
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-[var(--color-surface-2)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-brand-500)] transition-all"
                style={{ width: `${sow.progress ?? 0}%` }}
                role="progressbar"
                aria-valuenow={sow.progress ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress ${sow.progress ?? 0}%`}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      {sow.tags && Array.isArray(sow.tags) && sow.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sow.tags.map((tag: string) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Child tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" /> Sub-task ({childTasks?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!childTasks || childTasks.length === 0 ? (
            <div className="text-center py-8 text-sm text-[var(--color-text-tertiary)]">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Belum ada sub-task
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border-subtle)]">
              {childTasks.map(task => (
                <li key={task.id}>
                  <Link
                    href={`/sow/${task.id}`}
                    className="flex items-center justify-between gap-3 py-3 px-2 -mx-2 rounded hover:bg-[var(--color-surface-2)] transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-[var(--color-text-tertiary)]">{task.code}</span>
                      <span className="text-sm font-medium text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-brand-500)]">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={(STATUS_VARIANT as any)[task.status] ?? 'outline'} className="text-xs">
                        {(STATUS_LABEL as any)[task.status] ?? task.status}
                      </Badge>
                      <span className="text-xs font-mono text-[var(--color-text-tertiary)] w-10 text-right">{task.progress ?? 0}%</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
