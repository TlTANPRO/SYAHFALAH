// app/api/operational/[entity]/route.ts
// Plan C Phase 2 — Operational layer API.
// 4 entities: vehicles, office_assets, attendance_logs, utility_readings.
// Generic dispatcher shape (same as marketing/projects/purchasing/maintenance).
// Auth: any authenticated user can list; POST restricted to owner/kepala_kantor.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

type Entity = 'vehicles' | 'office_assets' | 'attendance_logs' | 'utility_readings'

const ENTITY_CONFIG: Record<Entity, { select: string; required: string[] }> = {
  vehicles: {
    select: 'id, code, name, plate_number, vehicle_type, assigned_user_id, notes, is_active, created_at',
    required: ['name'],
  },
  office_assets: {
    select: 'id, code, name, asset_type, serial_number, assigned_user_id, purchase_date, purchase_price_rupiah, condition_note, created_at',
    required: ['name'],
  },
  attendance_logs: {
    select: 'id, user_id, log_date, check_in_at, check_out_at, status, notes, created_at',
    required: ['user_id', 'log_date'],
  },
  utility_readings: {
    select: 'id, utility_type, reading_value, unit, recorded_at, recorded_by, notes, created_at',
    required: ['utility_type', 'reading_value'],
  },
}

function isEntity(s: string): s is Entity {
  return s in ENTITY_CONFIG
}

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
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 25, 100)
    const offset = (page - 1) * pageSize

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    let query = sb
      .from(entity)
      .select(cfg.select, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    // Optional filters per entity
    const userId = url.searchParams.get('user_id')?.trim()
    const logDate = url.searchParams.get('log_date')?.trim()
    const utilityType = url.searchParams.get('utility_type')?.trim()
    if (userId) query = query.eq('user_id', userId)
    if (logDate) query = query.eq('log_date', logDate)
    if (utilityType) query = query.eq('utility_type', utilityType)

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
    if (!['owner', 'kepala_kantor'].includes(payload.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const { entity } = await ctx.params
    if (!isEntity(entity)) return NextResponse.json({ error: 'unknown entity' }, { status: 404 })
    const cfg = ENTITY_CONFIG[entity]

    const body = await req.json().catch(() => ({}))
    for (const r of cfg.required) {
      if (body[r] == null || body[r] === '') {
        return NextResponse.json({ error: `${r} wajib diisi` }, { status: 400 })
      }
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await sb
      .from(entity)
      .insert(body)
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
