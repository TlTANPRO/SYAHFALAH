// app/api/marketing/customers/route.ts
// Phase 2 — Marketing CRM customers endpoint.
// GET (search/list) + POST (create).
// Any logged-in user can read+create. Ownership enforced per-row in UI/API.

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
    const q = url.searchParams.get('q')?.trim() ?? ''
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 25, 100)
    const offset = (page - 1) * pageSize

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceClient
      .from('customers')
      .select('id, code, full_name, phone, email, address, ktp_number, notes, metadata, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (q) {
      query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,code.ilike.%${q}%`)
    }

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { full_name, phone, email, address, ktp_number, notes, code } = body ?? {}
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return NextResponse.json({ error: 'full_name wajib (>= 2 karakter)' }, { status: 400 })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Auto-generate code if not provided
    const customerCode = code ?? `CUST-${Date.now().toString(36).toUpperCase()}`
    const { data, error } = await serviceClient
      .from('customers')
      .insert({
        code: customerCode,
        full_name: full_name.trim(),
        phone: phone ?? null,
        email: email ?? null,
        address: address ?? null,
        ktp_number: ktp_number ?? null,
        notes: notes ?? null,
      })
      .select('id, code')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
