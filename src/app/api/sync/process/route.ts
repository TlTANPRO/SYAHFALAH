// src/app/api/sync/process/route.ts
// Phase 4-5 — Offline sync replay worker.
// Drains pending rows from offline_sync_queue. Each row's payload is
// applied to its target_table with the requested operation. Idempotent
// via (user_id, client_op_id) UNIQUE — repeated submissions land in
// 'duplicate' status without re-executing.
//
// Auth: user's own session; processes their own queue only.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

const ALLOWED_TABLES: Record<string, 'insert' | 'update' | 'delete'> = {
  // Whitelist — only these tables accept offline writes.
  'tasks': 'insert',
  'attendance_logs': 'insert',
  'leads': 'insert',
  'maintenance_logs': 'insert',
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'env missing' }, { status: 500 })

    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

    // Body shape: { client_op_id, target_table, operation, payload }
    // Single-op mode for client batching simplicity.
    const body = await req.json().catch(() => ({}))
    const { client_op_id, target_table, operation, payload: opPayload } = body ?? {}
    if (!client_op_id || !target_table || !operation) {
      return NextResponse.json({ error: 'client_op_id + target_table + operation wajib' }, { status: 400 })
    }
    if (!ALLOWED_TABLES[target_table]) {
      return NextResponse.json({ error: `target_table '${target_table}' tidak diizinkan` }, { status: 400 })
    }
    if (!['insert', 'update', 'delete'].includes(operation)) {
      return NextResponse.json({ error: 'operation tidak valid' }, { status: 400 })
    }

    // Dedup: check existing row
    const { data: existing } = await sb
      .from('offline_sync_queue')
      .select('id, status')
      .eq('user_id', payload.userId)
      .eq('client_op_id', client_op_id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'completed' || existing.status === 'duplicate') {
        return NextResponse.json({ status: existing.status, replayed: false })
      }
    }

    // Insert queue row (idempotent via UNIQUE on (user_id, client_op_id))
    const { data: queued, error: queueErr } = await sb
      .from('offline_sync_queue')
      .upsert({
        user_id: payload.userId,
        client_op_id,
        target_table,
        operation,
        payload: opPayload ?? {},
        status: 'processing',
        received_at: new Date().toISOString(),
      }, { onConflict: 'user_id,client_op_id' })
      .select('id')
      .single()
    if (queueErr || !queued) {
      return NextResponse.json({ error: `queue: ${queueErr?.message}` }, { status: 500 })
    }

    // Apply payload to target_table
    let applyErr: string | null = null
    if (operation === 'insert') {
      const { error } = await sb.from(target_table).insert({ ...opPayload, user_id: payload.userId })
      applyErr = error?.message ?? null
    } else if (operation === 'update') {
      const { error } = await sb.from(target_table)
        .update(opPayload)
        .eq('id', opPayload.id)
        .eq('user_id', payload.userId)
      applyErr = error?.message ?? null
    } else if (operation === 'delete') {
      const { error } = await sb.from(target_table)
        .delete()
        .eq('id', opPayload.id)
        .eq('user_id', payload.userId)
      applyErr = error?.message ?? null
    }

    // Update queue status
    await sb.from('offline_sync_queue').update({
      status: applyErr ? 'failed' : 'completed',
      error_message: applyErr ?? null,
      processed_at: new Date().toISOString(),
    }).eq('id', queued.id)

    if (applyErr) {
      return NextResponse.json({ status: 'failed', error: applyErr, queue_id: queued.id }, { status: 422 })
    }
    return NextResponse.json({ status: 'completed', queue_id: queued.id })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

export async function GET() {
  // Status probe for the client's pending queue
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data } = await sb
      .from('offline_sync_queue')
      .select('id, client_op_id, target_table, operation, status, received_at, processed_at, error_message')
      .eq('user_id', payload.userId)
      .order('received_at', { ascending: false })
      .limit(50)
    return NextResponse.json({ data: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
