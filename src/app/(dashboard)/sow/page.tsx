// sow/page.tsx
// Read-only SOW library for all roles. Lists every SOW task so anyone
// can browse what is in scope across the company.

import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Clock } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

async function loadSow() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { sow: [], divisions: [] }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [{ data: sow }, { data: divs }] = await Promise.all([
    supabase
      .from('sow_tasks')
      .select('id, code, title, description, priority, status, estimated_hours, division_id')
      .order('priority', { ascending: false })
      .order('code', { ascending: true }),
    supabase.from('divisions').select('id, name'),
  ])
  return { sow: sow ?? [], divisions: divs ?? [] }
}

const priorityVariant: Record<string, 'default' | 'info' | 'warning' | 'destructive'> = {
  low: 'default', medium: 'info', high: 'warning', critical: 'destructive',
}
const statusVariant: Record<string, 'default' | 'success' | 'info' | 'warning'> = {
  draft: 'default', active: 'success', on_hold: 'warning', archived: 'default',
}

export default async function Page() {
  const { sow, divisions } = await loadSow()
  const divName = new Map(divisions.map((d: any) => [d.id, d.name]))

  return (
    <div className="space-y-6">
      <div>
      <Breadcrumbs crumbs={ [{ label: 'SOW Library' }] } />
        
        <h1 className="font-heading text-2xl font-bold">SOW Library</h1>
        <p className="text-[var(--color-text-secondary)]">{sow.length} SOW tersedia untuk semua divisi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sow.map((s: any) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-[var(--color-text-secondary)] flex-shrink-0" />
                    <span className="font-mono text-xs text-[var(--color-text-secondary)]">{s.code}</span>
                  </div>
                  <h3 className="text-base font-medium">{s.title}</h3>
                </div>
                <Badge variant={priorityVariant[s.priority] || 'default'}>{s.priority}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {s.description && (
                <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3">{s.description}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statusVariant[s.status] || 'default'}>{s.status}</Badge>
                {s.division_id && (
                  <Badge variant="outline">{divName.get(s.division_id) || '—'}</Badge>
                )}
                {s.estimated_hours && (
                  <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                    <Clock className="h-3 w-3" />
                    {s.estimated_hours}h
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
