// app/api/marketing/[entity]/[id]/route.ts
// PATCH + DELETE for individual marketing entity row (leads, surveys, etc.).
// Used by DetailSheet for edit + delete.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

const ENTITY_CONFIG: Record<string, string[]> = {
  surveys: ['lead_id', 'customer_id', 'surveyor_id', 'cluster_id', 'scheduled_date', 'completed_date', 'result', 'photos', 'notes'],
  bookings: ['lead_id', 'customer_id', 'cluster_id', 'booking_date', 'booking_fee', 'status', 'booking_letter_no', 'notes'],
  sp3k: ['booking_id', 'customer_id', 'documents', 'status', 'sla_deadline', 'reviewer_id', 'reviewed_at', 'review_note'],
  akad: ['sp3k_id', 'customer_id', 'notaris_id', 'scheduled_date', 'signed_date', 'notary_name', 'notary_fee', 'status', 'notes'],
  leads: ['customer_name', 'customer_phone', 'cluster_id', 'source', 'stage', 'estimated_value_rupiah', 'notes', 'score', 'assigned_to_id', 'contacted_at', 'surveyed_at', 'booked_at', 'closing_at', 'batal_at', 'batal_reason', 'code'],
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ entity: string; id: string }> }) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const { entity, id } = await ctx.params
    const allowedFields = ENTITY_CONFIG[entity]
    if (!allowedFields) return NextResponse.json({ error: 'unknown entity' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const filtered: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in body) filtered[key] = body[key]
    }
    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await serviceClient
      .from(entity)
      .update(filtered)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ entity: string; id: string }> }) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const { entity, id } = await ctx.params
    const allowedFields = ENTITY_CONFIG[entity]
    if (!allowedFields) return NextResponse.json({ error: 'unknown entity' }, { status: 404 })

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await serviceClient.from(entity).delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { id, deleted: true } })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
