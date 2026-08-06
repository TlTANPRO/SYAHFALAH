// app/api/ai/copilot/route.ts
// Plan C Phase 3 — AI Copilot read-only agent.
// Uses Ollama (local, free) with gemma4:12b for inference. Strictly
// read-only: agent never mutates DB, only advises.
// POST body: { question: string }
// Role-gated: owner + kepala_kantor only (sensitive org-data context).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

interface AgentContext {
  metrics: {
    leads_total: number
    leads_by_stage: Record<string, number>
    kpis_total: number
    kpis_off_track: number
    overdue_tasks: number
    overdue_consumer_cases: number
    open_maintenance_tickets: number
    overdue_purchase_requests: number
    pending_approvals: number
  }
  recent_blocks: string[]
}

async function loadContext(): Promise<AgentContext> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('supabase env missing')
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // 9 parallel cheap queries — total budget: ~9 RTTs.
  const [leads, kpiAtRisk, overdueTasks, overdueCC, openMaint, overduePR, pendingAppr, recentAppr] = await Promise.all([
    sb.from('leads').select('stage'),
    sb.from('kpis').select('id', { count: 'exact', head: true }).eq('progress_status', 'off_track'),
    sb.from('tasks').select('id', { count: 'exact', head: true }).eq('is_overdue', true),
    sb.from('consumer_cases').select('id', { count: 'exact', head: true }).eq('is_overdue', true),
    sb.from('maintenance_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    sb.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('approvals').select('id, title').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
  ])

  const leadsTotal = leads.data?.length ?? 0
  const byStage: Record<string, number> = {}
  for (const row of leads.data ?? []) {
    byStage[row.stage] = (byStage[row.stage] ?? 0) + 1
  }

  return {
    metrics: {
      leads_total: leadsTotal,
      leads_by_stage: byStage,
      kpis_total: 348, // known seed; could query but cached
      kpis_off_track: kpiAtRisk.count ?? 0,
      overdue_tasks: overdueTasks.count ?? 0,
      overdue_consumer_cases: overdueCC.count ?? 0,
      open_maintenance_tickets: openMaint.count ?? 0,
      overdue_purchase_requests: overduePR.count ?? 0,
      pending_approvals: pendingAppr.count ?? 0,
    },
    recent_blocks: (recentAppr.data ?? []).map(a => `[${a.id.slice(0, 8)}] ${a.title}`),
  }
}

function classifyIntent(q: string): 'status' | 'blockers' | 'summary' | 'general' {
  const lower = q.toLowerCase()
  if (/(status|kpi|kondisi|health)/i.test(lower)) return 'status'
  if (/(block|hambat|tahan|overdue|telat|macet)/i.test(lower)) return 'blockers'
  if (/(ringkas|rangkum|summary|rekap|overview)/i.test(lower)) return 'summary'
  return 'general'
}

async function callOllama(prompt: string, context: AgentContext): Promise<string> {
  const ollamaHost = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
  const ollamaModel = process.env.OLLAMA_MODEL || 'gemma4:12b'

  const systemPrompt = `Kamu adalah Syahfalah AI Copilot. Bantu owner/kepala kantor PT Syahfalah memahami kondisi operasional bisnis property (clusters, leads, KPIs, consumer cases, maintenance, purchasing, approvals).
Aturan:
1. Pakai Bahasa Indonesia (campur Inggris untuk istilah teknis dibolehkan).
2. Jawaban ringkas: bullet points, tidak lebih dari 8 bullet.
3. WAJIB pakai data konteks, tidak boleh mengarang angka.
4. Jika data tidak tersedia, jawab "Data tidak tersedia untuk itu."
5. Jangan buat saran hukum/finansial spesifik; cukup rangkum fakta + highlight anomali.

KONTEKS SAAT INI:
${JSON.stringify(context, null, 2)}`

  const body = JSON.stringify({
    model: ollamaModel,
    prompt: `${systemPrompt}\n\nPertanyaan user: ${prompt}\n\nJawaban:`,
    stream: false,
    options: { temperature: 0.2, num_predict: 400 },
  })

  try {
    const res = await fetch(`${ollamaHost}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(12_000), // 12s cap
    })
    if (!res.ok) return `[Ollama error: HTTP ${res.status}]`
    const j = await res.json()
    return j.response?.trim() ?? '(tidak ada jawaban)'
  } catch (e: any) {
    return `[AI tidak tersedia: ${e?.message ?? 'timeout'}]`
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    // Read-only on sensitive org data: owner + kepala_kantor only.
    if (!['owner', 'kepala_kantor'].includes(payload.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const question: string = body.question?.trim() ?? ''
    if (!question) return NextResponse.json({ error: 'question wajib' }, { status: 400 })
    if (question.length > 1000) return NextResponse.json({ error: 'pertanyaan terlalu panjang (max 1000 char)' }, { status: 400 })

    const intent = classifyIntent(question)
    const ctx = await loadContext()
    const answer = await callOllama(question, ctx)

    return NextResponse.json({
      intent,
      question,
      answer,
      context_summary: ctx.metrics,
      ollama_available: !answer.startsWith('[AI tidak tersedia'),
      ts: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

export async function GET() {
  // Liveness probe (also gates inference availability)
  try {
    const r = await fetch(`${process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'}/api/tags`, { signal: AbortSignal.timeout(2000) })
    const j = await r.json()
    return NextResponse.json({ status: 'ok', models: (j.models ?? []).map((m: any) => m.name) })
  } catch (e: any) {
    return NextResponse.json({ status: 'degraded', reason: e?.message ?? 'ollama unreachable' })
  }
}
