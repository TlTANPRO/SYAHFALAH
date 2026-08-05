// app/api/twin/overview/route.ts
// Plan C Phase 1 Item 4 — Digital Twin lite.
// Owner + Kepala Kantor can see org-wide vitals.
// Returns aggregate tiles: counts, cascade health, activity, alerts.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    if (payload.role !== 'owner' && payload.role !== 'kepala_kantor') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const today = new Date().toISOString().slice(0, 10)
    const year = new Date().getFullYear()
    const monthStart = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`

    // Fire 8 lightweight count/aggregate queries in parallel.
    const [
      usersCount,
      activeUsersCount,
      divisionsCount,
      kpiDefsCount,
      kpiDefsCascadedCount,
      kpiTargetsYearCount,
      tasksCount,
      tasksActiveCount,
      tasksOverdueCount,
      leadsCount,
      leadsScoreAvg,
      recentTasks,
      recentKpis,
    ] = await Promise.all([
      serviceClient.from('users').select('id', { count: 'exact', head: true }),
      serviceClient.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
      serviceClient.from('divisions').select('id', { count: 'exact', head: true }).eq('is_active', true),
      serviceClient.from('kpi_definitions').select('id', { count: 'exact', head: true }).eq('is_active', true),
      serviceClient.from('kpi_definitions').select('id', { count: 'exact', head: true })
        .eq('is_active', true).not('cascade_level', 'is', null),
      serviceClient.from('kpi_targets').select('id', { count: 'exact', head: true })
        .gte('period', `${year}-01`).lte('period', `${year}-12`),
      serviceClient.from('tasks').select('id', { count: 'exact', head: true }),
      serviceClient.from('tasks').select('id', { count: 'exact', head: true })
        .not('status', 'in', '(done,cancelled)'),
      serviceClient.from('tasks').select('id', { count: 'exact', head: true })
        .not('status', 'in', '(done,cancelled)').lt('due_date', today),
      serviceClient.from('leads').select('id', { count: 'exact', head: true }),
      serviceClient.from('leads').select('score')
        .not('score', 'is', null)
        .then((r) => {
          if (!Array.isArray(r.data)) return 0
          const total = r.data.reduce((s, x) => s + (Number((x as any).score) || 0), 0)
          return r.data.length > 0 ? Math.round(total / r.data.length) : 0
        }),
      serviceClient.from('tasks')
        .select('id, title, status, due_date, priority, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
      serviceClient.from('kpis')
        .select('id, code, name, level, progress, status, period')
        .gte('period', monthStart)
        .order('progress', { ascending: true })
        .limit(8),
    ])

    const pickCount = (r: { count: number | null } | null) => r?.count ?? 0

    const overview = {
      generated_at: new Date().toISOString(),
      counts: {
        users: pickCount(usersCount),
        active_users: pickCount(activeUsersCount),
        divisions: pickCount(divisionsCount),
        kpi_definitions: pickCount(kpiDefsCount),
        kpi_definitions_cascaded: pickCount(kpiDefsCascadedCount),
        kpi_targets_year: pickCount(kpiTargetsYearCount),
        tasks: pickCount(tasksCount),
        tasks_active: pickCount(tasksActiveCount),
        tasks_overdue: pickCount(tasksOverdueCount),
        leads: pickCount(leadsCount),
        leads_score_avg: leadsScoreAvg as number,
      },
      cascade_health: {
        definitions_with_level: pickCount(kpiDefsCascadedCount),
        total_definitions: pickCount(kpiDefsCount),
        ratio: pickCount(kpiDefsCount) === 0
          ? 0
          : Math.round((pickCount(kpiDefsCascadedCount) / pickCount(kpiDefsCount)) * 100),
      },
      recent_tasks: (Array.isArray(recentTasks.data) ? recentTasks.data : []) as Array<{
        id: string; title: string; status: string; due_date: string | null; priority: string | null; created_at: string
      }>,
      recent_kpis: (Array.isArray(recentKpis.data) ? recentKpis.data : []) as Array<{
        id: string; code: string; name: string; level: string; progress: number | null; status: string | null; period: string
      }>,
    }

    return NextResponse.json(overview)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
