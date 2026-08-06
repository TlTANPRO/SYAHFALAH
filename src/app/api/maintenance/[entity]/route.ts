// app/api/maintenance/[entity]/route.ts
// Phase 2 — Maintenance API.
// 2 entities: maintenance_tickets, maintenance_logs.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

type Entity = 'maintenance_tickets' | 'maintenance_logs'

const ENTITY_CONFIG: Record<Entity, { select: string; required: string[] }> = {
  maintenance_tickets: {
    select: 'id, code, title, description, customer_id, house_unit_id, project_id, reported_by_id, assigned_to_id, priority, status, category, reported_at, resolved_at, cost_rupiah, notes, created_at, updated_at',
    required: ['title'],
  },
  maintenance_logs: {
    select: 'id, ticket_id, actor_id, action, from_status, to_status, message, created_at',
    required: ['ticket_id', 'action'],
  },
}

function isEntity(s: string): s is Entity { return s in ENTITY_CONFIG }

export async function GET(req: NextRequest, ctx: { params: Promise<{ entity: string }> }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const { entity } = await ctx.params
    if (!isEntity(entity)) return NextResponse.json({ error: 'unknown entity' }, { status: 404 })
    const cfg = ENTITY_CONFIG[entity]

    const url = req.nextUrl
    const status = url.searchParams.get('status')?.trim()
    const ticketId = url.searchParams.get('ticket_id')?.trim()
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 25, 100)
    const offset = (page - 1) * pageSize

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    let query = sb.from(entity).select(cfg.select, { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)
    if (status && entity === 'maintenance_tickets') query = query.eq('status', status)
    if (ticketId) query = query.eq('ticket_id', ticketId)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ entity: string }> }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const { entity } = await ctx.params
    if (!isEntity(entity)) return NextResponse.json({ error: 'unknown entity' }, { status: 404 })
    const cfg = ENTITY_CONFIG[entity]

    const body = await req.json().catch(() => ({}))
    for (const r of cfg.required) {
      if (body[r] == null || body[r] === '') {
        return NextResponse.json({ error: `${r} wajib diisi` }, { status: 400 })
      }
    }

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await sb.from(entity).insert(body).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
