// src/app/(dashboard)/joblist/page.tsx
// Read-only joblist mirror. Server Component shell that fetches the initial
// payload, then hands off to a Client Component (JoblistClient) for live
// polling + interactivity. See ./JoblistClient.tsx for the UI.

import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { SheetKey } from '@/lib/sheets/sync'
import { JoblistClient, type JoblistRow, type JoblistResponse } from './JoblistClient'

export const dynamic = 'force-dynamic'

export default async function JoblistPage() {
  const session = await getServerSession()
  if (!session?.user) redirect('/login')

  const sb = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  let q = sb
    .from('tasks')
    .select('id, external_id, title, status, priority, due_date, completed_at, description, user_id, division_id, last_synced_at, users:user_id(full_name)')
    .like('external_id', 'sheets:%')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(2000)

  if (session.user.role === 'staff') {
    q = q.eq('user_id', session.user.id)
  } else if (session.user.role === 'pic_divisi') {
    q = q.eq('division_id', session.user.divisionId ?? '__none__')
  }

  const { data } = await q

  const kpi = { today: 0, total: 0, overdue: 0, done: 0 }
  const bySheet: Record<string, JoblistRow[]> = {}
  const sheetNamesSeen = new Set<string>()

  for (const t of data ?? []) {
    const ext = (t.external_id ?? '') as string
    const parts = ext.split(':')
    const sheetKey = (parts[1] ?? 'MASTER') as SheetKey
    sheetNamesSeen.add(sheetKey)
    if (!bySheet[sheetKey]) bySheet[sheetKey] = []
    const rowIdxMatch = (parts[2] ?? '').match(/^R(\d+)$/)
    const rowIdx = rowIdxMatch ? Number(rowIdxMatch[1]) : 0
    const u = t.users as { full_name?: string } | { full_name?: string }[] | null
    const assigneeName = Array.isArray(u) ? u[0]?.full_name ?? null : u?.full_name ?? null

    bySheet[sheetKey].push({
      id: t.id as string,
      sheet: sheetKey,
      rowIdx,
      title: (t.title ?? '') as string,
      dueDate: (t.due_date ?? null) as string | null,
      priority: (t.priority ?? 'medium') as JoblistRow['priority'],
      status: (t.status ?? 'pending') as JoblistRow['status'],
      category: 'Uncategorized',
      notes: (t.description ?? null) as string | null,
      completedAt: (t.completed_at ?? null) as string | null,
      assigneeName,
      assigneeId: (t.user_id ?? null) as string | null,
      lastSyncedAt: (t.last_synced_at ?? null) as string | null,
    })
    kpi.total++
    if ((t.status as string) === 'completed') kpi.done++
    if ((t.due_date ?? null) === today) kpi.today++
    if ((t.status as string) !== 'completed' && t.due_date && (t.due_date as string) < today) kpi.overdue++
  }

  // Diagnostic: if we have rows but they're all from one tab, the other tabs
  // are likely failing to sync (header not found, sheet restricted, etc).
  // Surface this so user can see the state without checking Vercel logs.
  const hasAnyData = kpi.total > 0
  const onlyOneTab = hasAnyData && sheetNamesSeen.size === 1

  const initial: JoblistResponse = {
    ok: true,
    kpi,
    bySheet: bySheet as Record<SheetKey, JoblistRow[]>,
    generatedAt: new Date().toISOString(),
    diagnostic: { onlyOneTab, sheetsWithData: Array.from(sheetNamesSeen) },
  }

  return <JoblistClient initial={initial} />
}
