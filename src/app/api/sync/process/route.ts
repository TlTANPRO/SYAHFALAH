// src/app/api/sync/process/route.ts
// Phase 4-5 — Offline sync replay worker.
// Drains pending rows from offline_sync_queue. Each row's payload is
// applied to its target_table with the requested operation. Idempotent
// via (user_id, client_op_id) UNIQUE — repeated submissions land in
// 'duplicate' status without re-executing.
//
// Auth: user's own session; processes their own queue only.
//
// Body shapes accepted:
//   1) Single-op mode  { client_op_id, target_table, operation, payload }
//      Returns  { status: 'completed'|'failed'|'duplicate', replayed: bool }
//   2) Batch mode      { mutations: SingleOpShape[] }
//      Returns  { ok: true, results: [{client_op_id, status, id?, error?}, ...] }

import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

const ALLOWED_TABLES: Record<string, 'insert' | 'update' | 'delete'> = {
  // Whitelist — only these tables accept offline writes.
  'tasks': 'insert',
  'attendance_logs': 'insert',
  'leads': 'insert',
  'maintenance_logs': 'insert',
}

const MAX_BATCH = 200

type Mutation = {
  client_op_id: string
  target_table: string
  operation: 'insert' | 'update' | 'delete'
  payload?: Record<string, unknown>
  dedup_key?: string
}

type BatchResult = {
  client_op_id: string
  status: 'completed' | 'failed' | 'duplicate' | 'rejected'
  queue_id?: string
  id?: string
  error?: string
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const auth = await verifyAccessToken(token)
    if (!auth) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'env missing' }, { status: 500 })

    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

    const body = await req.json().catch(() => null) as unknown
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'bad_request', message: 'expected JSON object body' }, { status: 400 })
    }

    // Detect batch vs single.
    const b = body as { mutations?: unknown[] } & Mutation
    if (Array.isArray(b.mutations)) {
      if (b.mutations.length === 0) {
        return NextResponse.json({ ok: true, applied: 0, failed: 0, results: [] })
      }
      if (b.mutations.length > MAX_BATCH) {
        return NextResponse.json({ error: 'batch_too_large', message: `max ${MAX_BATCH} mutations per batch` }, { status: 413 })
      }
      const items = b.mutations as Mutation[]
      const results: BatchResult[] = []
      for (const m of items) {
        results.push(await replayOne(sb, m, auth.userId))
      }
      return NextResponse.json({
        ok: true,
        applied: results.filter(r => r.status === 'completed').length,
        failed: results.filter(r => r.status === 'failed' || r.status === 'rejected').length,
        duplicates: results.filter(r => r.status === 'duplicate').length,
        results,
      })
    }

    // Single-op fallback.
    const single = b as Mutation
    if (!single.client_op_id || !single.target_table || !single.operation) {
      return NextResponse.json({ error: 'client_op_id + target_table + operation wajib' }, { status: 400 })
    }
    const r = await replayOne(sb, single, auth.userId)
    const status =
      r.status === 'completed' ? 200 :
      r.status === 'failed'    ? 422 :
      r.status === 'duplicate' ? 200 :
                                  400
    return NextResponse.json({
      status: r.status,
      replayed: r.status === 'completed',
      error: r.error ?? null,
      queue_id: r.queue_id ?? null,
      id: r.id ?? null,
    }, { status })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

async function replayOne(
  sb: SupabaseClient,
  m: Mutation,
  userId: string,
): Promise<BatchResult> {
  if (!m?.client_op_id || !m.target_table || !m.operation) {
    return { client_op_id: m?.client_op_id ?? '?', status: 'rejected', error: 'missing client_op_id/target_table/operation' }
  }
  if (!ALLOWED_TABLES[m.target_table]) {
    return { client_op_id: m.client_op_id, status: 'rejected', error: `target_table '${m.target_table}' not in allowlist` }
  }
  if (!['insert', 'update', 'delete'].includes(m.operation)) {
    return { client_op_id: m.client_op_id, status: 'rejected', error: `operation '${m.operation}' invalid` }
  }

  const opPayload = m.payload ?? {}

  // Step 1: dedup probe (cheap)
  const { data: existing } = await sb
    .from('offline_sync_queue')
    .select('id, status')
    .eq('user_id', userId)
    .eq('client_op_id', m.client_op_id)
    .maybeSingle()

  if (existing && (existing.status === 'completed' || existing.status === 'duplicate')) {
    return { client_op_id: m.client_op_id, status: 'duplicate', queue_id: existing.id }
  }

  // Step 2: queue row (idempotent via UNIQUE)
  const { data: queued, error: queueErr } = await sb
    .from('offline_sync_queue')
    .upsert({
      user_id: userId,
      client_op_id: m.client_op_id,
      target_table: m.target_table,
      operation: m.operation,
      payload: opPayload,
      dedup_key: m.dedup_key ?? null,
      status: 'processing',
      received_at: new Date().toISOString(),
    }, { onConflict: 'user_id,client_op_id' })
    .select('id')
    .single()

  if (queueErr || !queued) {
    return { client_op_id: m.client_op_id, status: 'failed', error: `queue: ${queueErr?.message ?? 'unknown'}` }
  }

  // Step 3: replay against target table. user_id is forced server-side.
  let applyErr: string | null = null
  let resultId: string | undefined
  if (m.operation === 'insert') {
    const { data, error } = await sb.from(m.target_table).insert({ ...opPayload, user_id: userId }).select('id').single()
    applyErr = error?.message ?? null
    resultId = data?.id
  } else if (m.operation === 'update') {
    if (!opPayload.id) {
      applyErr = 'update requires payload.id'
    } else {
      const rowId = String(opPayload.id)
      const rest = { ...opPayload } as Record<string, unknown>
      delete (rest as { id?: unknown }).id
      const { data, error } = await sb.from(m.target_table).update(rest).eq('id', rowId).eq('user_id', userId).select('id').single()
      applyErr = error?.message ?? null
      resultId = data?.id ?? rowId
    }
  } else if (m.operation === 'delete') {
    if (!opPayload.id) {
      applyErr = 'delete requires payload.id'
    } else {
      const { error } = await sb.from(m.target_table).delete().eq('id', String(opPayload.id)).eq('user_id', userId)
      applyErr = error?.message ?? null
      resultId = String(opPayload.id)
    }
  }

  // Step 4: persist final status
  const finalStatus = applyErr ? 'failed' : 'completed'
  await sb.from('offline_sync_queue').update({
    status: finalStatus,
    error_message: applyErr ?? null,
    processed_at: new Date().toISOString(),
  }).eq('id', queued.id)

  return applyErr
    ? { client_op_id: m.client_op_id, status: 'failed', error: applyErr, queue_id: queued.id }
    : { client_op_id: m.client_op_id, status: 'completed', queue_id: queued.id, id: resultId }
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
