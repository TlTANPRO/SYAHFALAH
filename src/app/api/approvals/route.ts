// app/api/approvals/route.ts
// Plan C Phase 1 Item 6 — Approval workflow v2 API.
// GET: list approvals (filter by status / requester / approver / mine-only).
// POST: create new approval request.
//
// Ownership is enforced at the API layer using the session role:
//   owner / kepala_kantor: see all
//   pic_divisi: see own division
//   staff: see only own (requester or approver)
// RLS policies also enforce the same at the DB layer as a backstop.

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, isError } from '@/lib/api/auth-guard'
import { buildError, apiError } from '@/lib/api/errors'

// PostgREST nested select (FKs auto-joined) - same shape the previous version used.
const APPROVALS_SELECT = `
  id, requester_id, approver_id, title, description, kind, status,
  amount, metadata, decided_at, decision_note, created_at, updated_at,
  requester:requester_id(id, full_name, email),
  approver:approver_id(id, full_name, email)
`

const VALID_KINDS = ['general', 'spending', 'leave', 'access', 'budget', 'sow'] as const

export async function GET(req: NextRequest) {
  const session = await requireAuth()
  if (isError(session)) return session

  const url = req.nextUrl
  const status = url.searchParams.get('status')?.trim()
  const requesterId = url.searchParams.get('requester_id')?.trim()
  const approverId = url.searchParams.get('approver_id')?.trim()
  const mine = url.searchParams.get('mine') === '1'
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 25, 100)
  const offset = (page - 1) * pageSize

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  let q = sb
    .from('approvals')
    .select(APPROVALS_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)
  if (status) q = q.eq('status', status)
  if (requesterId) q = q.eq('requester_id', requesterId)
  if (approverId) q = q.eq('approver_id', approverId)

  // Visibility by role — fix IDOR: staff used to see all 6 rows.
  if (mine || session.role === 'staff') {
    q = q.or(`requester_id.eq.${session.userId},approver_id.eq.${session.userId}`)
  } else if (session.role === 'pic_divisi' && session.divisionId) {
    // PIC divisi: own division's approvals (requester OR approver in same division)
    const { data: divUsers } = await sb
      .from('users')
      .select('id')
      .eq('division_id', session.divisionId)
    const ids = (divUsers ?? []).map((u) => u.id)
    if (ids.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, pageSize })
    }
    const list = ids.join(',')
    q = q.or(`requester_id.in.(${list}),approver_id.in.(${list})`)
  }
  // owner / kepala_kantor: no extra filter (see all)

  const { data, error, count } = await q
  if (error) return buildError('INTERNAL', error.message)
  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize })
}

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  if (isError(session)) return session

  const body = (await req.json().catch(() => ({}))) ?? {}
  const { title, description, kind, amount, approver_id, metadata } = body

  // Custom validations kept inline (amount type check is special)
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return apiError.badRequest('title wajib (>= 3 karakter)')
  }
  if (kind && !VALID_KINDS.includes(kind)) {
    return apiError.badRequest(`kind tidak valid. Pilihan: ${VALID_KINDS.join(',')}`)
  }
  if (amount != null && (typeof amount !== 'number' || amount < 0)) {
    return apiError.badRequest('amount harus numeric >= 0')
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const insert = {
    requester_id: session.userId,
    approver_id: approver_id ?? null,
    title: title.trim(),
    description: description ?? null,
    kind: kind ?? 'general',
    amount: amount ?? null,
    metadata: metadata ?? {},
    status: 'pending',
  }
  const { data, error } = await sb.from('approvals').insert(insert).select('id').single()
  if (error) return buildError('INTERNAL', error.message)
  return NextResponse.json({ id: (data as { id: string } | null)?.id, status: 'pending' }, { status: 201 })
}