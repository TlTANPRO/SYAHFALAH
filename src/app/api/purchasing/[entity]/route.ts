// app/api/purchasing/[entity]/route.ts
// Phase 2 — Purchasing API.
// 4 entities: suppliers, materials, purchase_requests, purchase_orders.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

type Entity = 'suppliers' | 'materials' | 'purchase_requests' | 'purchase_orders'

const ENTITY_CONFIG: Record<Entity, { select: string; required: string[]; allowedStatus?: string[] }> = {
  suppliers: {
    select: 'id, code, name, contact_name, phone, email, address, npwp, bank_account, notes, is_active, created_at',
    required: ['name'],
  },
  materials: {
    select: 'id, code, name, category, unit, standard_price_rupiah, description, is_active, created_at',
    required: ['name'],
  },
  purchase_requests: {
    select: 'id, code, requester_id, project_id, title, description, needed_by, status, approver_id, approved_at, notes, created_at',
    required: ['title', 'requester_id'],
    allowedStatus: ['pending', 'approved', 'rejected', 'ordered', 'cancelled'],
  },
  purchase_orders: {
    select: 'id, code, request_id, supplier_id, project_id, total_rupiah, status, order_date, expected_date, received_date, notes, created_at',
    required: ['supplier_id', 'total_rupiah'],
    allowedStatus: ['draft', 'sent', 'confirmed', 'received', 'cancelled'],
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
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 25, 100)
    const offset = (page - 1) * pageSize

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    let query = sb.from(entity).select(cfg.select, { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)
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
    if (body.status && cfg.allowedStatus && !cfg.allowedStatus.includes(body.status)) {
      return NextResponse.json({ error: `status tidak valid` }, { status: 400 })
    }

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await sb.from(entity).insert(body).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
