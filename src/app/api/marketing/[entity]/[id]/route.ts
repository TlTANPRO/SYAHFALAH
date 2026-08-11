// src/app/api/marketing/[entity]/[id]/route.ts
// PATCH + DELETE for individual marketing records (leads, surveys, bookings, sp3k, akad).

import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

// PATCH and DELETE handlers per entity — all use the same generic CRUD pattern
const configs = {
  leads: {
    table: 'leads',
    allowedFields: [
      'customer_name', 'customer_phone', 'cluster_id', 'source',
      'stage', 'estimated_value_rupiah', 'score', 'assigned_to_id',
      'contacted_at', 'closing_at', 'batal_at',
    ],
  },
  surveys: {
    table: 'surveys',
    allowedFields: [
      'lead_id', 'customer_id', 'surveyor_id', 'cluster_id',
      'scheduled_date', 'completed_date', 'result', 'photos', 'notes',
    ],
  },
  bookings: {
    table: 'bookings',
    allowedFields: [
      'lead_id', 'customer_id', 'cluster_id', 'booking_date',
      'booking_fee', 'status', 'booking_letter_no', 'notes',
    ],
  },
  sp3k: {
    table: 'sp3k',
    allowedFields: [
      'booking_id', 'customer_id', 'documents', 'status',
      'sla_deadline', 'reviewer_id', 'reviewed_at', 'review_note',
    ],
  },
  akad: {
    table: 'akad',
    allowedFields: [
      'sp3k_id', 'customer_id', 'notaris_id', 'scheduled_date',
      'signed_date', 'notary_name', 'notary_fee', 'status', 'notes',
    ],
  },
}

type Entity = keyof typeof configs

function isEntity(s: string): s is Entity {
  return s in configs
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ entity: string; id: string }> }) {
  const { entity: rawEntity } = await ctx.params
  if (!isEntity(rawEntity)) {
    return NextResponse.json({ error: 'unknown entity' }, { status: 404 })
  }
  const cfg = configs[rawEntity]
  const handler = makePatchHandler(cfg)
  return handler(req, ctx)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ entity: string; id: string }> }) {
  const { entity: rawEntity } = await ctx.params
  if (!isEntity(rawEntity)) {
    return NextResponse.json({ error: 'unknown entity' }, { status: 404 })
  }
  const cfg = configs[rawEntity]
  const handler = makeDeleteHandler(cfg)
  return handler(req, ctx)
}