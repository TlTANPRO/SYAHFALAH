// src/app/api/joblist/route.ts
// Read-only joblist mirror. Aggregates `tasks` table rows whose
// `external_id LIKE 'sheets:%'`, groups by sheet key, returns per-sheet
// rows + 4 KPI counts. Filtered by session role:
//   - staff: only their own user_id
//   - pic_divisi: their division
//   - kepala_kantor / owner: all rows
//
// KPI semantics (all computed in UTC for determinism across deploys):
//   - today: rows with due_date = today
//   - total: count of all returned rows
//   - overdue: rows with status != 'completed' AND due_date < today
//   - done: rows with status = 'completed'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { SHEET_REGISTRY, type SheetKey } from '@/lib/sheets/sync'

interface JoblistRow {
  id: string
  sheet: SheetKey
  rowIdx: number
  title: string
  dueDate: string | null
  priority: string
  status: string
  category: string
  notes: string | null
  completedAt: string | null
  assigneeName: string | null
  assigneeId: string | null
  lastSyncedAt: string | null
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const auth = await verifyAccessToken(token)
  if (!auth) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'env missing' }, { status: 500 })

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // Read tasks joined to users for assignee display name.
  let q = sb
    .from('tasks')
    .select('id, external_id, title, status, priority, due_date, completed_at, description, user_id, last_synced_at, users:user_id(full_name)')
    .like('external_id', 'sheets:%')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(2000)

  // Role-based scoping. staff sees own; pic_divisi sees division; owner/kepala_kantor all.
  if (auth.role === 'staff') {
    q = q.eq('user_id', auth.userId)
  } else if (auth.role === 'pic_divisi') {
    q = q.eq('division_id', auth.divisionId ?? '__none__')
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const today = new Date().toISOString().slice(0, 10)
  const kpi = { today: 0, total: 0, overdue: 0, done: 0 }
  const bySheet: Record<string, JoblistRow[]> = {}

  for (const t of data ?? []) {
    const ext = (t.external_id ?? '') as string
    const parts = ext.split(':') // ['sheets', 'SHEET_KEY', 'R{idx}']
    const sheetKey = (parts[1] ?? 'MASTER') as SheetKey
    if (!bySheet[sheetKey]) bySheet[sheetKey] = []
    const rowIdxMatch = (parts[2] ?? '').match(/^R(\d+)$/)
    const rowIdx = rowIdxMatch ? Number(rowIdxMatch[1]) : 0

    const row: JoblistRow = {
      id: t.id as string,
      sheet: sheetKey,
      rowIdx,
      title: (t.title ?? '') as string,
      dueDate: (t.due_date ?? null) as string | null,
      priority: (t.priority ?? 'medium') as string,
      status: (t.status ?? 'pending') as string,
      category: 'Uncategorized',
      notes: (t.description ?? null) as string | null,
      completedAt: (t.completed_at ?? null) as string | null,
      assigneeName: (Array.isArray(t.users) ? t.users[0]?.full_name : (t.users as { full_name?: string } | null)?.full_name) ?? null,
      assigneeId: (t.user_id ?? null) as string | null,
      lastSyncedAt: (t.last_synced_at ?? null) as string | null,
    }
    bySheet[sheetKey].push(row)
    kpi.total++
    if (row.status === 'completed') kpi.done++
    if (row.dueDate === today) kpi.today++
    if (row.status !== 'completed' && row.dueDate && row.dueDate < today) kpi.overdue++
  }

  return NextResponse.json({
    ok: true,
    kpi,
    sheets: SHEET_REGISTRY,
    bySheet,
    generatedAt: new Date().toISOString(),
  })
}
