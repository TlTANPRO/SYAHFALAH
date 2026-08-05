// personal/sow/page.tsx
// Personal SOW page. Lists the SOW tasks assigned to the user OR in
// the user's division. Falls back to the whole SOW library if the user
// has no specific assignment yet.

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Clock, ChevronRight } from 'lucide-react'

interface SowTask {
  id: string
  code: string
  title: string
  description: string | null
  priority: string
  status: string
  estimated_hours: number | null
  division_id: string | null
}

async function load(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { sow: [], divisions: [] }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: userRow } = await supabase.from('users').select('division_id').eq('id', userId).single()
  const divisionId = userRow?.division_id
  const { data: sow } = await supabase
    .from('sow_tasks')
    .select('id, code, title, description, priority, status, estimated_hours, division_id')
    .or(divisionId ? `division_id.eq.${divisionId},division_id.is.null` : 'division_id.is.null')
    .order('priority', { ascending: false })
    .order('code', { ascending: true })
  const { data: divs } = await supabase.from('divisions').select('id, name')
  return { sow: (sow ?? []) as SowTask[], divisions: (divs ?? []) as { id: string; name: string }[] }
}

const priorityVariant: Record<string, 'default' | 'info' | 'warning' | 'destructive'> = {
  low: 'default', medium: 'info', high: 'warning', critical: 'destructive',
}
const statusVariant: Record<string, 'default' | 'success' | 'info' | 'warning'> = {
  draft: 'default', active: 'success', on_hold: 'warning', archived: 'default',
}

export default async function Page() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const payload = token ? await verifyAccessToken(token) : null
  const userId = payload?.userId

  if (!userId) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-bold">My SOW</h1>
        <p className="text-[var(--color-text-secondary)]">Sesi tidak valid. Silakan login ulang.</p>
      </div>
    )
  }

  const { sow, divisions } = await load(userId)
  const divName = new Map(divisions.map(d => [d.id, d.name]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">My SOW</h1>
        <p className="text-[var(--color-text-secondary)]">{sow.length} SOW relevan untuk posisi Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sow.map(s => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-2">
                <Link
                  href={`/sow/${s.id}`}
                  className="group min-w-0 inline-flex items-center gap-1 text-[var(--color-brand-500)] hover:underline"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-[var(--color-text-secondary)] flex-shrink-0" />
                      <span className="font-mono text-xs text-[var(--color-text-secondary)]">{s.code}</span>
                    </div>
                    <h3 className="text-base font-medium">{s.title}</h3>
                  </div>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </Link>
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
