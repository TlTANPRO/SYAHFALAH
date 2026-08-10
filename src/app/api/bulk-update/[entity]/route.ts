// src/app/api/bulk-update/[entity]/route.ts
// POST /api/bulk-update/{entity} - bulk update multiple rows in one transaction.
// Body: { ids: string[], fields: Record<string, any> }
// Only fields in the schema are allowed (whitelisted).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getSchema } from '@/lib/schema/registry'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ entity: string }> }
) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const { entity } = await ctx.params
    const schema = getSchema(entity)
    if (!schema) return NextResponse.json({ error: 'unknown entity' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: any) => typeof x === 'string') : []
    const fields = typeof body.fields === 'object' && body.fields !== null ? body.fields : {}

    if (ids.length === 0) return NextResponse.json({ error: 'no ids' }, { status: 400 })
    if (ids.length > 200) return NextResponse.json({ error: 'max 200 ids per batch' }, { status: 400 })
    if (Object.keys(fields).length === 0) return NextResponse.json({ error: 'no fields' }, { status: 400 })

    // Whitelist fields
    const allowedFieldNames = new Set(schema.fields.map((f) => f.name))
    const filtered: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) {
      if (allowedFieldNames.has(k)) filtered[k] = v
    }
    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: 'no allowed fields' }, { status: 400 })
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update in batch using IN
    const { data, error } = await sb
      .from(schema.table)
      .update(filtered)
      .in('id', ids)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log each row
    try {
      await (sb.from('api_audit_log') as any).insert(
        ids.map((id) => ({
          user_id: payload.userId,
          table_name: schema.table,
          row_id: id,
          action: 'UPDATE',
          before: null,
          after: filtered,
        }))
      )
    } catch {
      // audit log table may not exist yet
    }

    return NextResponse.json({ 
      data: { 
        updated: data?.length ?? 0,
        ids,
        fields: filtered,
      } 
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
