// app/api/users/route.ts
// Server-side list + search + filter untuk admin/users page.
// JWT cookie verify (same pattern as notifications/tasks).

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
    if (payload.role !== 'owner') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const url = req.nextUrl
    const q = url.searchParams.get('q')?.trim()
    const role = url.searchParams.get('role') || 'all'
    const division = url.searchParams.get('division') || 'all'
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 50, 200)
    const offset = (page - 1) * pageSize

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceClient
      .from('users')
      .select('id, full_name, email, phone, role, position, division_id, is_active', { count: 'exact' })
      .order('role', { ascending: true })
      .order('full_name', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (role !== 'all') query = query.eq('role', role)
    if (division !== 'all') query = query.eq('division_id', division)
    if (q) {
      // ilike search across name/email/phone/position
      query = query.or(
        `full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,position.ilike.%${q}%`
      )
    }

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
