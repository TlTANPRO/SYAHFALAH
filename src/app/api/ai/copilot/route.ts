// app/api/ai/copilot/route.ts
// Plan C Phase 3 — AI Copilot read-only agent.
// Multi-provider cascade: Ollama → NVIDIA NIM → Groq → deterministic.
// Strictly read-only: agent never mutates DB, only advises.
// POST body: { question: string }
// Role-gated: owner + kepala_kantor only.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { generateAIAnswer, probeProviders, ProviderName } from '@/lib/ai/providers'

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
      kpis_total: 348,
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

function deterministicAnswer(q: string, ctx: AgentContext): string {
  const m = ctx.metrics
  const lines: string[] = []
  if (q.match(/status|kpi|kondisi|health/i)) {
    lines.push(`- Total leads aktif: ${m.leads_total}`)
    const stagePart = Object.entries(m.leads_by_stage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([s, n]) => `${s}=${n}`)
      .join(', ')
    if (stagePart) lines.push(`- Distribusi stage: ${stagePart}`)
    lines.push(`- KPI off-track: ${m.kpis_off_track}`)
    lines.push(`- Tasks overdue: ${m.overdue_tasks}`)
    lines.push(`- Consumer cases overdue: ${m.overdue_consumer_cases}`)
    lines.push(`- Maintenance tickets open: ${m.open_maintenance_tickets}`)
  } else if (q.match(/block|hambat|tahan|overdue|telat|macet|risk/i)) {
    if (m.overdue_tasks > 0) lines.push(`- ⚠ ${m.overdue_tasks} tasks overdue`)
    if (m.overdue_consumer_cases > 0) lines.push(`- ⚠ ${m.overdue_consumer_cases} consumer cases overdue`)
    if (m.kpis_off_track > 0) lines.push(`- ⚠ ${m.kpis_off_track} KPI off-track`)
    if (m.open_maintenance_tickets > 0) lines.push(`- ${m.open_maintenance_tickets} maintenance tickets open`)
    if (m.pending_approvals > 0) lines.push(`- ${m.pending_approvals} pending approval`)
    if (m.overdue_purchase_requests > 0) lines.push(`- ⚠ ${m.overdue_purchase_requests} purchase request pending`)
    if (lines.length === 0) lines.push('- Tidak ada blocker terdeteksi.')
  } else if (q.match(/ringkas|rekap|summary|overview|cashflow|uang/i)) {
    lines.push(`- Pipeline aktif: ${m.leads_total} leads`)
    lines.push(`- Backlog tasks: ${m.overdue_tasks} overdue, ${m.kpis_total} KPI`)
    lines.push(`- Tunggakan konsumen: ${m.overdue_consumer_cases} cases`)
    lines.push(`- Operasional: ${m.open_maintenance_tickets} tickets, ${m.pending_approvals} approval`)
  } else {
    lines.push(`- Leads pipeline: ${m.leads_total} aktif`)
    lines.push(`- KPI off-track: ${m.kpis_off_track} / ${m.kpis_total}`)
    lines.push(`- Overdue tasks: ${m.overdue_tasks}`)
    if (ctx.recent_blocks.length > 0) {
      lines.push(`- Pending approvals:`)
      ctx.recent_blocks.slice(0, 3).forEach(b => lines.push(`  · ${b}`))
    }
  }
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    if (!['owner', 'kepala_kantor'].includes(payload.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const question: string = body.question?.trim() ?? ''
    if (!question) return NextResponse.json({ error: 'question wajib' }, { status: 400 })
    if (question.length > 1000) return NextResponse.json({ error: 'pertanyaan terlalu panjang (max 1000 char)' }, { status: 400 })

    const intent = classifyIntent(question)
    const ctx = await loadContext()

    const aiResult = await generateAIAnswer(question, ctx)
    let answer: string
    let provider: 'ollama' | 'nim' | 'groq' | 'openrouter' | 'deterministic'
    let available: boolean
    if (aiResult) {
      answer = aiResult.text
      provider = aiResult.provider
      available = true
    } else {
      answer = deterministicAnswer(question, ctx)
      provider = 'deterministic'
      available = false
    }

    return NextResponse.json({
      intent,
      question,
      answer,
      context_summary: ctx.metrics,
      ollama_available: provider === 'ollama' || process.env.OLLAMA_HOST === '1',
      provider,
      available,
      ts: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

export async function GET() {
  const result = await probeProviders()
  return NextResponse.json(result)
}
