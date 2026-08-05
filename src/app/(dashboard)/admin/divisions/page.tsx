// admin/divisions/page.tsx
// Owner-only division management. Reads from the divisions table and
// joins with KPI rollups so the admin can see headcount + KPI health
// per division at a glance.

import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, FileText, Users, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

interface Division {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
}

interface DivisionSummary {
  division_id: string
  total_tasks: number
  pending_count: number
  in_progress_count: number
  completed_count: number
  overdue_count: number
}

async function loadDivisions(): Promise<{ divisions: Division[]; summaries: Map<string, DivisionSummary> }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { divisions: [], summaries: new Map() }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [{ data: divs }, { data: sums }] = await Promise.all([
    supabase
      .from('divisions')
      .select('id, code, name, description, is_active, sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('division_task_summary').select('*').neq('division_name', 'Test Seed')
      .select('division_id, total_tasks, pending_count, in_progress_count, completed_count, overdue_count'),
  ])
  // The view column is `division_id` (not `id`); build a map keyed by division_id.
  const summaryMap = new Map<string, DivisionSummary>()
  for (const s of sums ?? []) {
    summaryMap.set((s as DivisionSummary).division_id, s as DivisionSummary)
  }
  return { divisions: (divs ?? []) as Division[], summaries: summaryMap }
}

export default async function Page() {
  const { divisions, summaries } = await loadDivisions()

  return (
    <div className="space-y-6">
      <div>
      <Breadcrumbs crumbs={ [{ label: 'Admin', href: '/admin' }, { label: 'Divisi' }] } />
        
        <h1 className="font-heading text-2xl font-bold">Divisi</h1>
        <p className="text-[var(--color-text-secondary)]">{divisions.length} divisi terdaftar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {divisions.map(d => {
          const s = summaries.get(d.id)
          return (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <Link
                    href={`/divisi/${d.id}`}
                    className="group inline-flex items-center gap-1 text-[var(--color-brand-500)] hover:underline"
                    aria-label={`Buka detail ${d.name}`}
                  >
                    <Building2 className="h-4 w-4 text-[var(--color-text-secondary)] group-hover:text-[var(--color-brand-500)]" />
                    {d.name}
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <Badge variant={d.is_active ? 'success' : 'outline'}>
                    {d.is_active ? 'Aktif' : 'Non-aktif'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {d.description && (
                  <p className="text-sm text-[var(--color-text-secondary)]">{d.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{d.code}</Badge>
                </div>
                {s && (
                  <div className="border-t border-[var(--color-border-default)] pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="text-xs">Total tasks</span>
                    </div>
                    <div className="text-right font-medium tabular-nums">{s.total_tasks}</div>
                    <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-xs">In progress</span>
                    </div>
                    <div className="text-right font-medium tabular-nums">{s.in_progress_count}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">Selesai</div>
                    <div className="text-right text-[var(--color-success)] font-medium tabular-nums">{s.completed_count}</div>
                    {s.overdue_count > 0 && (
                      <>
                        <div className="text-xs text-[var(--color-danger)]">Overdue</div>
                        <div className="text-right text-[var(--color-danger)] font-medium tabular-nums">{s.overdue_count}</div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
