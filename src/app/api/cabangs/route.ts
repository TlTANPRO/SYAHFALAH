// app/api/cabangs/route.ts
// Phase 4 — Multi-cabang CRUD.
// GET (list with stats) + POST (create). Owner-only.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const [cabangs, divs, cl, proj, usrs] = await Promise.all([
      sb.from('cabangs').select('*').order('code'),
      sb.from('divisions').select('cabang_id'),
      sb.from('clusters').select('cabang_id'),
      sb.from('projects').select('cabang_id'),
      sb.from('users').select('cabang_id').eq('is_active', true),
    ])

    const stats = (cabangs.data ?? []).map(c => ({
      ...c,
      stats: {
        divisions: (divs.data ?? []).filter(d => d.cabang_id === c.id).length,
        clusters: (cl.data ?? []).filter(d => d.cabang_id === c.id).length,
        projects: (proj.data ?? []).filter(d => d.cabang_id === c.id).length,
        users: (usrs.data ?? []).filter(d => d.cabang_id === c.id).length,
      },
    }))

    return NextResponse.json({ data: stats })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    if (payload.role !== 'owner') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    if (!body.code || !body.name) return NextResponse.json({ error: 'code + name wajib' }, { status: 400 })

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await sb.from('cabangs').insert({
      code: body.code.trim(),
      name: body.name.trim(),
      region: body.region ?? null,
      address: body.address ?? null,
      phone: body.phone ?? null,
      is_active: true,
    }).select('id, code, name').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
