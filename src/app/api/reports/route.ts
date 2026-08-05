// app/api/reports/route.ts
// Server-side list for owner reports page (per-division summary cards).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const url = req.nextUrl
    const q = url.searchParams.get('q')?.trim()
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 12, 50)
    const offset = (page - 1) * pageSize

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceClient
      .from('divisions')
      .select('id, name, description, created_at', { count: 'exact' })
      .neq('name', 'Test Seed')
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (q) query = query.ilike('name', `%${q}%`)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
