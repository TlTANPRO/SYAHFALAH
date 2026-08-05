// app/api/approvals/route.ts
// Plan C Phase 1 Item 6 — Approval workflow v2 API.
// GET: list approvals (filter by status / requester / approver / mine-only).
// POST: create new approval request.
//
// Ownership: anyone logged-in can list/create approvals.
// Decision endpoints (/api/approvals/[id]/decision) are owner-only
// (only owner decides), matches existing role hierarchy.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

const VALID_KINDS = ['general', 'spending', 'leave', 'access', 'budget', 'sow'] as const

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const url = req.nextUrl
    const status = url.searchParams.get('status')?.trim()
    const requesterId = url.searchParams.get('requester_id')?.trim()
    const approverId = url.searchParams.get('approver_id')?.trim()
    const mine = url.searchParams.get('mine') === '1'  // only rows where current user is requester
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 25, 100)
    const offset = (page - 1) * pageSize

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceClient
      .from('approvals')
      .select(`
        id, requester_id, approver_id, title, description, kind, status,
        amount, metadata, decided_at, decision_note, created_at, updated_at,
        requester:requester_id(id, full_name, email),
        approver:approver_id(id, full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (status) query = query.eq('status', status)
    if (requesterId) query = query.eq('requester_id', requesterId)
    if (approverId) query = query.eq('approver_id', approverId)
    if (mine) query = query.eq('requester_id', payload.userId)

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

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { title, description, kind, amount, approver_id, metadata } = body ?? {}

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ error: 'title wajib (>= 3 karakter)' }, { status: 400 })
    }
    if (kind && !VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: `kind tidak valid. Pilihan: ${VALID_KINDS.join(',')}` }, { status: 400 })
    }
    if (amount != null && (typeof amount !== 'number' || amount < 0)) {
      return NextResponse.json({ error: 'amount harus numeric >= 0' }, { status: 400 })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const insert = {
      requester_id: payload.userId,
      approver_id: approver_id ?? null,
      title: title.trim(),
      description: description ?? null,
      kind: kind ?? 'general',
      amount: amount ?? null,
      metadata: metadata ?? {},
      status: 'pending',
    }
    const { data, error } = await serviceClient
      .from('approvals')
      .insert(insert)
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ id: (data as any)?.id, status: 'pending' }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
