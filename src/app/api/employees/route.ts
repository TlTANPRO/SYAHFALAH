// app/api/employees/route.ts
// Plan C Phase 1 item 1 — Employee profile API.
// GET (list, with q/role/division filter + pagination).
// Same shape as /api/users but exposes the Wave 1 employee profile columns
// (hire_date, skills, photo_url, date_of_birth, reporting_to_user_id).
// Auth: owner only (employees PII surface).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

const SELECT =
  'id, full_name, email, phone, role, position, division_id, is_active, ' +
  'avatar_url, hire_date, skills, photo_url, date_of_birth, reporting_to_user_id, ' +
  'created_at, updated_at'

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
    const division = url.searchParams.get('division_id') || 'all'
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 25, 100)
    const offset = (page - 1) * pageSize

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceClient
      .from('users')
      .select(SELECT, { count: 'exact' })
      .order('full_name', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (role !== 'all') query = query.eq('role', role)
    if (division !== 'all') query = query.eq('division_id', division)
    if (q) {
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
