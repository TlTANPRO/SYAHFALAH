// app/api/marketing/[entity]/route.ts
// Phase 2 — Generic Marketing CRM endpoint.
// Handles 4 entities with the same shape: surveys, bookings, sp3k, akad.
// GET (list + filter) + POST (create). No PATCH here — state transitions
// are a separate concern (move to /api/marketing/[entity]/[id]/transition).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

type Entity = 'surveys' | 'bookings' | 'sp3k' | 'akad'

const ENTITY_CONFIG: Record<Entity, { select: string; allowedStatus: string[]; required: string[] }> = {
  surveys: {
    select: 'id, lead_id, customer_id, surveyor_id, cluster_id, scheduled_date, completed_date, result, photos, notes, created_at',
    allowedStatus: ['interested', 'not_interested', 'pending', 'revisit'],
    required: ['lead_id'],
  },
  bookings: {
    select: 'id, lead_id, customer_id, cluster_id, booking_date, booking_fee, status, booking_letter_no, notes, created_at',
    allowedStatus: ['pending', 'confirmed', 'cancelled', 'expired'],
    required: ['lead_id'],
  },
  sp3k: {
    select: 'id, booking_id, customer_id, documents, status, sla_deadline, reviewer_id, reviewed_at, review_note, created_at',
    allowedStatus: ['pending', 'approved', 'rejected', 'cancelled'],
    required: ['booking_id'],
  },
  akad: {
    select: 'id, sp3k_id, customer_id, notaris_id, scheduled_date, signed_date, notary_name, notary_fee, status, notes, created_at',
    allowedStatus: ['scheduled', 'signed', 'cancelled', 'rescheduled'],
    required: ['sp3k_id'],
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
    const status = url.searchParams.get('status')?.trim()
    const leadId = url.searchParams.get('lead_id')?.trim()
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

    if (status) query = query.eq('status', status)
    if (leadId) query = query.eq('lead_id', leadId)

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
    // Validate required fields
    for (const r of cfg.required) {
      if (!body[r]) return NextResponse.json({ error: `${r} wajib diisi` }, { status: 400 })
    }
    if (body.status && !cfg.allowedStatus.includes(body.status)) {
      return NextResponse.json({ error: `status tidak valid. Pilihan: ${cfg.allowedStatus.join(',')}` }, { status: 400 })
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
