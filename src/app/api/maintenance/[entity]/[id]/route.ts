// app/api/maintenance/[entity]/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

type Entity = 'maintenance_tickets' | 'maintenance_logs'

const ENTITY_CONFIG: Record<Entity, { allowedFields: string[] }> = {
  maintenance_tickets: {
    allowedFields: ['code', 'title', 'description', 'customer_id', 'house_unit_id', 'project_id', 'reported_by_id', 'assigned_to_id', 'priority', 'status', 'category', 'cost_rupiah', 'resolved_at'],
  },
  maintenance_logs: {
    allowedFields: ['ticket_id', 'actor_id', 'action', 'from_status', 'to_status', 'note'],
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
