// app/api/ai/copilot/route.ts
// Plan C Phase 3+ — AI Copilot read-only agent.
// Loads comprehensive business context (lib/ai/context.ts), then asks
// multi-provider cascade (Ollama → NIM → Groq → OpenRouter) for an LLM
// answer using that context. If all providers fail, deterministic
// builder formats a bullet summary from the same context.
//
// POST { question: string } → { intent, question, answer, provider, available, context_summary }
// GET → { providers: [...] }
//
// Role-gated: owner + kepala_kantor only.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { generateAIAnswer, probeProviders } from '@/lib/ai/providers'
import { loadBusinessContext, deterministicSlice } from '@/lib/ai/context'

function classifyIntent(q: string): 'status' | 'blockers' | 'cashflow' | 'people' | 'general' {
  const lower = q.toLowerCase()
  if (/(status|kpi|kondisi|health|ringkas|rangkum|summary)/i.test(lower)) return 'status'
  if (/(block|hambat|tahan|overdue|telat|macet|risk)/i.test(lower)) return 'blockers'
  if (/(cluster|cash|uang|rupiah|sale|project|unit|budget|spent)/i.test(lower)) return 'cashflow'
  if (/(orang|user|karyawan|pegawai|absen|attendance|staff|role|division)/i.test(lower)) return 'people'
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
    const ctx = await loadBusinessContext()

    const aiResult = await generateAIAnswer(question, ctx)
    const answer: string = aiResult?.text ?? deterministicSlice(question, ctx)
    const provider = aiResult?.provider ?? 'deterministic'
    const available = !!aiResult

    return NextResponse.json({
      intent,
      question,
      answer,
      context_summary: {
        metrics: ctx.company.metrics,
        cashflow: ctx.company.cashflow,
        clusters: ctx.company.clusters.length,
        projects: ctx.company.projects.length,
        people: ctx.company.people,
        notifications_unread: ctx.company.notifications_unread,
      },
      available,
      provider,
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
