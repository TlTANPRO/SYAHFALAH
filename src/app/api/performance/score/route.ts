// app/api/performance/score/route.ts
// Plan C Phase 3 — Performance scoring.
// Returns per-user aggregated score based on:
// - On-time tasks (40% weight)
// - KPI progress average (40% weight)
// - Attendance logs (20% weight)
// Query param: ?user_id=... (optional, defaults to all users)
// Owner + kepala_kantor only.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

interface UserScore {
  user_id: string
  user_name: string
  division_name: string | null
  tasks_total: number
  tasks_on_time: number
  tasks_completion_rate: number | null
  kpis_count: number
  kpi_avg_progress: number | null
  attendance_total: number
  attendance_present_rate: number | null
  overall_score: number | null
  rank: number | null
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    if (!['owner', 'kepala_kantor'].includes(payload.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const url = req.nextUrl
    const userId = url.searchParams.get('user_id')

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Pull all 13 org members + recent operational rows
    const [users, tasks, att] = await Promise.all([
      sb.from('users').select('id, full_name, division_id, divisions(name)').eq('is_active', true).order('full_name'),
      sb.from('tasks').select('user_id, is_overdue, status').limit(5000),
      sb.from('attendance_logs').select('user_id, status').gte('log_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
    ])

    const userList = (users.data ?? []) as unknown as Array<{ id: string; full_name: string; division_id: string | null; divisions: { name: string } | null }>
    if (userList.length === 0) return NextResponse.json({ data: [] })

    // KPI summary via existing view
    const { data: kpi } = await sb.from('team_personal_kpis').select('user_id, progress_percentage').limit(2000)

    // Aggregate
    const kpiByUser = new Map<string, number[]>()
    for (const k of (kpi ?? []) as unknown as Array<{ user_id: string; progress_percentage: number | null }>) {
      if (!k.progress_percentage) continue
      const arr = kpiByUser.get(k.user_id) ?? []
      arr.push(Number(k.progress_percentage))
      kpiByUser.set(k.user_id, arr)
    }

    const taskAgg = new Map<string, { total: number; onTime: number }>()
    for (const t of (tasks.data ?? []) as unknown as Array<{ user_id: string; is_overdue: boolean; status: string }>) {
      const a = taskAgg.get(t.user_id) ?? { total: 0, onTime: 0 }
      a.total++
      if (t.status === 'completed' && !t.is_overdue) a.onTime++
      taskAgg.set(t.user_id, a)
    }

    const attAgg = new Map<string, { total: number; present: number }>()
    for (const a of (att.data ?? []) as unknown as Array<{ user_id: string; status: string }>) {
      const x = attAgg.get(a.user_id) ?? { total: 0, present: 0 }
      x.total++
      if (a.status === 'present' || a.status === 'late') x.present++
      attAgg.set(a.user_id, x)
    }

    const scores: UserScore[] = []
    for (const u of userList) {
      if (userId && u.id !== userId) continue
      const t = taskAgg.get(u.id) ?? { total: 0, onTime: 0 }
      const taskRate = t.total > 0 ? Math.round((t.onTime / t.total) * 100) : null

      const kpiArr = kpiByUser.get(u.id) ?? []
      const kpiAvg = kpiArr.length > 0 ? Math.round(kpiArr.reduce((s, v) => s + v, 0) / kpiArr.length) : null

      const a = attAgg.get(u.id) ?? { total: 0, present: 0 }
      const attRate = a.total > 0 ? Math.round((a.present / a.total) * 100) : null

      // Weighted: 40% tasks + 40% KPI + 20% attendance
      const parts: number[] = []
      if (taskRate != null) parts.push(taskRate * 0.4)
      else parts.push(50 * 0.4) // missing data = neutral 50
      if (kpiAvg != null) parts.push(kpiAvg * 0.4)
      else parts.push(50 * 0.4)
      if (attRate != null) parts.push(attRate * 0.2)
      else parts.push(50 * 0.2)

      scores.push({
        user_id: u.id,
        user_name: u.full_name,
        division_name: (u.divisions as any)?.name ?? null,
        tasks_total: t.total,
        tasks_on_time: t.onTime,
        tasks_completion_rate: taskRate,
        kpis_count: kpiArr.length,
        kpi_avg_progress: kpiAvg,
        attendance_total: a.total,
        attendance_present_rate: attRate,
        overall_score: Math.round(parts.reduce((s, v) => s + v, 0)),
        rank: null,
      })
    }

    scores.sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0))
    scores.forEach((s, i) => { s.rank = i + 1 })

    return NextResponse.json({ data: scores })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
