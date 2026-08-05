// app/api/approvals/[id]/decision/route.ts
// PATCH /api/approvals/[id]/decision { decision: 'approve' | 'reject', note?: string }
// Only owner + kepala_kantor can decide (matches hierarchy).
// Sets status, decided_at, approver_id, decision_note.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    if (payload.role !== 'owner' && payload.role !== 'kepala_kantor') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const { id } = await ctx.params
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { decision, note } = body ?? {}
    if (decision !== 'approve' && decision !== 'reject') {
      return NextResponse.json({ error: 'decision harus "approve" atau "reject"' }, { status: 400 })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const update = {
      status: decision === 'approve' ? 'approved' : 'rejected',
      approver_id: payload.userId,
      decided_at: new Date().toISOString(),
      decision_note: note ?? null,
    }

    const { data, error } = await serviceClient
      .from('approvals')
      .update(update)
      .eq('id', id)
      .eq('status', 'pending')  // only pending → decided
      .select('id, status, approver_id, decided_at, decision_note')
      .single()

    if (error) {
      // If no row updated, could be already-decided or wrong id
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'approval tidak ditemukan atau sudah diputuskan' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
