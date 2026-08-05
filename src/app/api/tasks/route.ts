// app/api/tasks/route.ts
// Server-side proxy for personal/tasks (client anon key tidak bisa setelah
// migration 010). Verifies JWT cookie lalu fetch via service-role.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const url = req.nextUrl
    const scheduledDate = url.searchParams.get('scheduled_date')
    const status = url.searchParams.get('status')
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200)
    const onlyMine = url.searchParams.get('mine') !== 'false'

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceClient
      .from('tasks')
      .select('id, code, title, description, status, priority, scheduled_date, due_date, completed_at, assignee_id, division_id, sow_task_id, reference_id, reference_type, created_at, updated_at')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit)

    if (onlyMine) {
      query = query.eq('assignee_id', payload.userId)
    }
    if (scheduledDate) {
      query = query.eq('scheduled_date', scheduledDate)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const body = await req.json()
    const { id, status } = body as { id?: string; status?: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (status === 'done' || status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await serviceClient
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('assignee_id', payload.userId)
      .select('id, status, completed_at, updated_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
