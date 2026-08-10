// src/app/api/audit/[table]/[id]/route.ts
// GET /api/audit/{table}/{id} - return audit log for a row.
// Used by DetailSheet history tab.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const { table, id } = await ctx.params
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200)

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Try to read from api_audit_log table. If it doesn't exist, return empty.
    const { data, error } = await (sb.from('api_audit_log') as any)
      .select('id, user_id, action, before, after, created_at, users:user_id(name)')
      .eq('table_name', table)
      .eq('row_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      // Table doesn't exist yet (before migration applied). Return empty.
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json({ data: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
