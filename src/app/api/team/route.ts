// app/api/team/route.ts
// Server-side list for kepala-kantor team page (per-division with team count).

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
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (q) query = query.ilike('name', `%${q}%`)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Augment with user counts (separate query — small set)
    let enriched: any[] = []
    if (data && data.length > 0) {
      const ids = data.map(d => d.id)
      const { data: userCounts } = await serviceClient
        .from('users')
        .select('division_id')
        .in('division_id', ids)
        .eq('is_active', true)
      const countMap = new Map<string, number>()
      for (const u of userCounts ?? []) {
        if (u.division_id) countMap.set(u.division_id, (countMap.get(u.division_id) || 0) + 1)
      }
      enriched = data.map(d => ({ ...d, member_count: countMap.get(d.id) ?? 0 }))
    }

    return NextResponse.json({ data: enriched, total: count ?? 0, page, pageSize })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
