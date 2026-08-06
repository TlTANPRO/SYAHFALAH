// app/api/ai/copilot/route.ts
// AI Copilot route. POST { question, history[] } → { answer, ... }
// Multi-turn: history is appended to the LLM message thread so
// follow-ups ("yang closing-nya?") reference prior context.
// Role-gated: owner + kepala_kantor only.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { probeProviders } from '@/lib/ai/providers'
import { runAgent, ConversationTurn } from '@/lib/ai/agent'

function classifyIntent(q: string): 'status' | 'blockers' | 'cashflow' | 'people' | 'tools' | 'general' {
  const lower = q.toLowerCase()
  if (/(status|kpi|kondisi|health|ringkas|rangkum|summary)/i.test(lower)) return 'status'
  if (/(block|hambat|tahan|overdue|telat|macet|risk)/i.test(lower)) return 'blockers'
  if (/(cluster|cash|uang|rupiah|sale|project|unit|budget|spent)/i.test(lower)) return 'cashflow'
  if (/(orang|user|karyawan|pegawai|absen|attendance|staff|role|division)/i.test(lower)) return 'people'
  if (/(https?:\/\/|tren|news|berita|video|artikel|riset|outlook|global|competitor|youtube|tiktok|instagram|twitter)/i.test(lower)) return 'tools'
  return 'general'
}

function sanitizeHistory(raw: any): ConversationTurn[] {
  if (!Array.isArray(raw)) return []
  const out: ConversationTurn[] = []
  for (const t of raw) {
    if (!t || typeof t !== 'object') continue
    if (t.role !== 'user' && t.role !== 'assistant') continue
    const content = typeof t.content === 'string' ? t.content.slice(0, 1000) : ''
    if (!content) continue
    out.push({ role: t.role, content })
  }
  // cap to last 10 entries
  return out.slice(-10)
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

    const history = sanitizeHistory(body.history)
    const intent = classifyIntent(question)
    const result = await runAgent(question, history)

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
      context_summary: null,
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
