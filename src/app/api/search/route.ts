// src/app/api/search/route.ts
// Full-text search across Syahfalah entities.
// Search: tasks, leads, projects, sow_tasks, raci_tasks, users, divisions.
// Server-side ILIKE on relevant text columns. Returns up to `limit` results grouped
// by entity. Owner-only access (gated by session).

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 25

type Hit = {
  id: string
  kind: 'task' | 'lead' | 'project' | 'sow' | 'raci' | 'user' | 'division'
  title: string
  subtitle?: string
  href: string
}

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ results: [], error: 'unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ results: [], error: 'config' }, { status: 500 })
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get('limit') ?? '12', 10) || 12,
    MAX_LIMIT
  )

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const ilike = `%${q}%`
  const perEntity = Math.max(2, Math.ceil(limit / 4))

  const [tasks, leads, projects, sows, users, divisions, raci] = await Promise.all([
    sb
      .from('tasks')
      .select('id, title, status, user_id, division_id')
      .or(`title.ilike.${ilike},description.ilike.${ilike}`)
      .limit(perEntity),
    sb
      .from('leads')
      .select('id, customer_name, stage, cluster_id')
      .or(`customer_name.ilike.${ilike},notes.ilike.${ilike}`)
      .limit(perEntity),
    sb
      .from('projects')
      .select('id, name, code, status, cluster_id')
      .or(`name.ilike.${ilike},code.ilike.${ilike}`)
      .limit(perEntity),
    sb
      .from('sow_tasks')
      .select('id, title, code, division_id')
      .or(`title.ilike.${ilike},code.ilike.${ilike},description.ilike.${ilike}`)
      .limit(perEntity),
    sb
      .from('users')
      .select('id, full_name, position, division_id')
      .eq('is_active', true)
      .or(`full_name.ilike.${ilike},position.ilike.${ilike}`)
      .limit(perEntity),
    sb
      .from('divisions')
      .select('id, name, code')
      .eq('is_active', true)
      .or(`name.ilike.${ilike},code.ilike.${ilike}`)
      .limit(perEntity),
    sb
      .from('raci_tasks')
      .select('id, task_name')
      .eq('is_active', true)
      .ilike('task_name', ilike)
      .limit(perEntity),
  ])

  const safe = <T,>(r: { data: T[] | null; error: unknown }): T[] => (r.error ? [] : (r.data ?? [])) as T[]

  const hits: Hit[] = [
    ...safe(tasks).map((t: any) => ({
      id: t.id,
      kind: 'task' as const,
      title: t.title,
      subtitle: `Task · ${t.status ?? 'open'}`,
      href: `/personal/tasks`,
    })),
    ...safe(leads).map((l: any) => ({
      id: l.id,
      kind: 'lead' as const,
      title: l.customer_name,
      subtitle: `Lead · ${l.stage}`,
      href: `/owner/marketing/leads/${l.id}`,
    })),
    ...safe(projects).map((p: any) => ({
      id: p.id,
      kind: 'project' as const,
      title: p.name,
      subtitle: `${p.code ?? 'Proyek'} · ${p.status}`,
      href: `/owner/projects/${p.id}`,
    })),
    ...safe(sows).map((s: any) => ({
      id: s.id,
      kind: 'sow' as const,
      title: s.title,
      subtitle: `${s.code ?? 'SOW'} · divisi`,
      href: `/personal/sow`,
    })),
    ...safe(users).map((u: any) => ({
      id: u.id,
      kind: 'user' as const,
      title: u.full_name,
      subtitle: u.position ?? 'Tim',
      href: `/admin/users`,
    })),
    ...safe(divisions).map((d: any) => ({
      id: d.id,
      kind: 'division' as const,
      title: d.name,
      subtitle: `${d.code ?? 'Divisi'}`,
      href: `/divisi/${d.id}`,
    })),
    ...safe(raci).map((r: any) => ({
      id: r.id,
      kind: 'raci' as const,
      title: r.task_name,
      subtitle: 'Aktivitas RACI',
      href: `/raci`,
    })),
  ]

  return NextResponse.json({ results: hits.slice(0, limit) })
}
