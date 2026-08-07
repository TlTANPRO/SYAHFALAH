// app/api/employees/[id]/route.ts
// Plan C Phase 1 item 1 — Employee detail.
// Returns full profile + reporting manager (if any) + activity counts.
// Auth: owner (employees PII surface) or self (a user can view their own
// profile; this is needed for /personal/sow etc. to work).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

const SELECT_USER = `
  id, full_name, email, phone, role, position, is_active,
  avatar_url, hire_date, skills, photo_url, date_of_birth,
  reporting_to_user_id, created_at, updated_at,
  division:divisions!users_division_id_fkey(id, name)
`

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const { id } = await ctx.params
    // Self can read self. Otherwise owner only.
    if (payload.userId !== id && payload.role !== 'owner') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    // Validate UUID shape before hitting the DB so we return 400 (not 500)
    // on malformed input.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'invalid id: not a valid uuid' }, { status: 400 })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: user, error } = await serviceClient
      .from('users')
      .select(SELECT_USER)
      .eq('id', id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // Fetch manager (if reporting_to_user_id set)
    let manager: any = null
    if (user.reporting_to_user_id) {
      const { data: m } = await serviceClient
        .from('users')
        .select('id, full_name, role, position, avatar_url')
        .eq('id', user.reporting_to_user_id)
        .maybeSingle()
      manager = m
    }

    // Fetch activity counts (tasks)
    const { count: taskCount } = await serviceClient
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id)

    const { count: doneCount } = await serviceClient
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id)
      .in('status', ['completed', 'done'])

    return NextResponse.json({
      ...user,
      manager,
      activity: {
        total_tasks: taskCount ?? 0,
        done_tasks: doneCount ?? 0,
        completion_rate: taskCount ? Math.round(((doneCount ?? 0) / taskCount) * 100) : 0,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
