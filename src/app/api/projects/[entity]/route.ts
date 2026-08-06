// app/api/projects/[entity]/route.ts
// Phase 2 — Project Management API.
// Handles 3 entities: projects, blocks, house_units.
// GET (list+filter) + POST (create).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

type Entity = 'projects' | 'blocks' | 'house_units'

const ENTITY_CONFIG: Record<Entity, { select: string; required: string[] }> = {
  projects: {
    select: 'id, code, name, cluster_id, total_units, units_completed, start_date, target_completion_date, budget_rupiah, spent_rupiah, status, project_manager_id, created_at',
    required: ['name', 'cluster_id', 'total_units', 'start_date', 'target_completion_date', 'budget_rupiah'],
  },
  blocks: {
    select: 'id, project_id, name, code, total_units, description, sort_order, created_at',
    required: ['project_id', 'name'],
  },
  house_units: {
    select: 'id, block_id, unit_number, type, size_m2, price_rupiah, status, customer_id, notes, created_at, updated_at',
    required: ['block_id', 'unit_number'],
  },
}

function isEntity(s: string): s is Entity {
  return s in ENTITY_CONFIG
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ entity: string }> }) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const { entity: rawEntity } = await ctx.params
    if (!isEntity(rawEntity)) return NextResponse.json({ error: 'unknown entity' }, { status: 404 })
    const cfg = ENTITY_CONFIG[rawEntity]

    const url = req.nextUrl
    const projectId = url.searchParams.get('project_id')?.trim()
    const blockId = url.searchParams.get('block_id')?.trim()
    const status = url.searchParams.get('status')?.trim()
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 25, 100)
    const offset = (page - 1) * pageSize

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceClient
      .from(rawEntity)
      .select(cfg.select, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (projectId && rawEntity !== 'projects') query = query.eq('project_id', projectId)
    if (blockId && rawEntity === 'house_units') query = query.eq('block_id', blockId)
    if (status) query = query.eq('status', status)

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
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const { entity: rawEntity } = await ctx.params
    if (!isEntity(rawEntity)) return NextResponse.json({ error: 'unknown entity' }, { status: 404 })
    const cfg = ENTITY_CONFIG[rawEntity]

    const body = await req.json().catch(() => ({}))
    for (const r of cfg.required) {
      if (body[r] == null || body[r] === '') {
        return NextResponse.json({ error: `${r} wajib diisi` }, { status: 400 })
      }
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await serviceClient
      .from(rawEntity)
      .insert(body)
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
