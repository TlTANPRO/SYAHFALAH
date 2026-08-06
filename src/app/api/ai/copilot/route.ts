// app/api/ai/copilot/route.ts
// Plan C Phase 3+ — AI Copilot route.
// Calls the new tool-calling agent (lib/ai/agent.ts) and returns the
// answer + step trace.
//
// POST { question: string } → { intent, question, answer, provider, available, steps, total_ms, context_summary }
// GET → { providers: [...] }
// Role-gated: owner + kepala_kantor only.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { probeProviders } from '@/lib/ai/providers'
import { runAgent } from '@/lib/ai/agent'

function classifyIntent(q: string): 'status' | 'blockers' | 'cashflow' | 'people' | 'tools' | 'general' {
  const lower = q.toLowerCase()
  if (/(status|kpi|kondisi|health|ringkas|rangkum|summary)/i.test(lower)) return 'status'
  if (/(block|hambat|tahan|overdue|telat|macet|risk)/i.test(lower)) return 'blockers'
  if (/(cluster|cash|uang|rupiah|sale|project|unit|budget|spent)/i.test(lower)) return 'cashflow'
  if (/(orang|user|karyawan|pegawai|absen|attendance|staff|role|division)/i.test(lower)) return 'people'
  if (/(https?:\/\/|tren|news|berita|video|artikel|riset|outlook|global|competitor|youtube|tiktok|instagram|twitter)/i.test(lower)) return 'tools'
  return 'general'
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
    const question: string = (body.question ?? '').trim()
    if (!question) return NextResponse.json({ error: 'question wajib' }, { status: 400 })
    if (question.length > 1000) return NextResponse.json({ error: 'pertanyaan terlalu panjang (max 1000 char)' }, { status: 400 })

    const intent = classifyIntent(question)
    const result = await runAgent(question)

    return NextResponse.json({
      intent,
      question,
      answer: result.answer,
      provider: result.provider,
      available: result.available,
      iterations: result.iterations,
      total_ms: result.total_ms,
      steps: result.steps.map(s => ({
        kind: s.kind,
        provider: s.provider,
        model: s.model,
        ms: s.ms,
        text: s.text?.slice(0, 400),
        tool_name: s.tool_name,
        tool_args: s.tool_args?.slice(0, 200),
        tool_result: s.tool_result?.slice(0, 400),
        tool_ok: s.tool_ok,
      })),
      context_summary: {
        metrics: result.context.company.metrics,
        cashflow: result.context.company.cashflow,
        clusters: result.context.company.clusters.length,
        projects: result.context.company.projects.length,
        people: result.context.company.people,
        notifications_unread: result.context.company.notifications_unread,
      },
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
