// app/api/calendar/events/route.ts
// Plan C Phase 1 Item 5 — Calendar upgrade.
// Returns upcoming events: tasks with due_date + KPI target periods.
// Read-only, JWT-aware (any logged-in user). Service-role for unified view.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export interface CalendarEvent {
  id: string
  kind: 'task' | 'kpi'
  title: string
  date: string        // YYYY-MM-DD
  meta?: {
    status?: string | null
    priority?: string | null
    period?: string | null
    code?: string | null
    level?: string | null
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const url = req.nextUrl
    const today = new Date().toISOString().slice(0, 10)
    const horizon = url.searchParams.get('horizon') ?? '30'  // days
    const horizonN = Math.max(1, Math.min(Number(horizon) || 30, 365))
    const limit = Math.min(Number(url.searchParams.get('limit')) || 30, 200)

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Compute horizon date in ISO. Tasks use due_date (DATE) column.
    const horizonDate = new Date()
    horizonDate.setDate(horizonDate.getDate() + horizonN)
    const horizonIso = horizonDate.toISOString().slice(0, 10)

    const [tasksRes, kpiRes] = await Promise.all([
      serviceClient
        .from('tasks')
        .select('id, title, due_date, status, priority')
        .not('due_date', 'is', null)
        .gte('due_date', today)
        .lte('due_date', horizonIso)
        .order('due_date', { ascending: true })
        .limit(limit),
      // KPI target periods within horizon — view kpis has period column.
      serviceClient
        .from('kpis')
        .select('id, code, name, level, period, status')
        .gte('period', today.slice(0, 7))  // current month prefix
        .lte('period', horizonIso.slice(0, 7))
        .order('period', { ascending: true })
        .limit(limit),
    ])

    const events: CalendarEvent[] = []

    if (Array.isArray(tasksRes.data)) {
      for (const t of tasksRes.data) {
        events.push({
          id: `task-${(t as any).id}`,
          kind: 'task',
          title: (t as any).title ?? '(tanpa judul)',
          date: (t as any).due_date ?? '',
          meta: {
            status: (t as any).status ?? null,
            priority: (t as any).priority ?? null,
          },
        })
      }
    }

    if (Array.isArray(kpiRes.data)) {
      for (const k of kpiRes.data) {
        events.push({
          id: `kpi-${(k as any).id}`,
          kind: 'kpi',
          title: (k as any).name ?? (k as any).code ?? '(KPI)',
          date: `${(k as any).period}-01`,  // first-of-month marker for KPI events
          meta: {
            code: (k as any).code ?? null,
            level: (k as any).level ?? null,
            status: (k as any).status ?? null,
            period: (k as any).period ?? null,
          },
        })
      }
    }

    events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

    return NextResponse.json({
      events,
      horizon_days: horizonN,
      generated_at: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
