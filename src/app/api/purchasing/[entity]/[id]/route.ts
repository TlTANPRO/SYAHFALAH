// app/api/purchasing/[entity]/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

type Entity = 'suppliers' | 'materials' | 'purchase_requests' | 'purchase_orders'

const ENTITY_CONFIG: Record<Entity, { allowedFields: string[] }> = {
  suppliers: {
    allowedFields: ['code', 'name', 'contact_name', 'phone', 'email', 'address', 'npwp', 'bank_account', 'notes', 'is_active'],
  },
  materials: {
    allowedFields: ['code', 'name', 'category', 'unit', 'standard_price_rupiah', 'description', 'is_active'],
  },
  purchase_requests: {
    allowedFields: ['code', 'title', 'description', 'status', 'requested_by_id', 'project_id', 'needed_by'],
  },
  purchase_orders: {
    allowedFields: ['code', 'supplier_id', 'purchase_request_id', 'status', 'total_rupiah', 'notes', 'ordered_at', 'received_at'],
  },
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity } = await ctx.params
  if (!(entity in ENTITY_CONFIG)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 400 })
  }
  const config = ENTITY_CONFIG[entity as Entity]
  const handler = makePatchHandler({
    table: entity,
    allowedFields: config.allowedFields,
  })
  return handler(req, ctx)
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity } = await ctx.params
  if (!(entity in ENTITY_CONFIG)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 400 })
  }
  const handler = makeDeleteHandler({
    table: entity,
    allowedFields: ENTITY_CONFIG[entity as Entity].allowedFields,
  })
  return handler(req, ctx)
}
