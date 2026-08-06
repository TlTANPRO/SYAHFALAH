// app/api/ai/copilot/route.ts
// AI Copilot route. Supports both streaming (SSE) and non-streaming JSON.
// POST { question, history[], stream?: bool }

import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { probeProviders } from '@/lib/ai/providers'
import { runAgent, runAgentStream, ConversationTurn } from '@/lib/ai/agent'

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
  return out.slice(-10)
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return new Response(JSON.stringify({ error: 'invalid session' }), { status: 401 })
    if (!['owner', 'kepala_kantor'].includes(payload.role)) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const question: string = (body.question ?? '').trim()
    if (!question) return new Response(JSON.stringify({ error: 'question wajib' }), { status: 400 })
    if (question.length > 1000) return new Response(JSON.stringify({ error: 'pertanyaan terlalu panjang (max 1000 char)' }), { status: 400 })

    const history = sanitizeHistory(body.history)
    const intent = classifyIntent(question)
    const wantsStream = !!body.stream

    if (!wantsStream) {
      const result = await runAgent(question, history)
      return new Response(JSON.stringify({
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
          intent: s.intent,
          persona: s.persona,
        })),
        ts: new Date().toISOString(),
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // Streaming SSE response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let sentFinal = false
        try {
          // Send intent first
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'intent', intent })}\n\n`))
          for await (const ev of runAgentStream(question, history)) {
            if (ev.type === 'step' && ev.step) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', step: { kind: ev.step.kind, provider: ev.step.provider, model: ev.step.model, ms: ev.step.ms, tool_name: ev.step.tool_name, tool_ok: ev.step.tool_ok, text: ev.step.text?.slice(0, 400), intent: ev.step.intent, persona: ev.step.persona } })}\n\n`))
            } else if (ev.type === 'delta' && ev.delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: ev.delta })}\n\n`))
            } else if (ev.type === 'done') {
              const final = ev.final!
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', provider: final.provider, available: final.available, total_ms: final.total_ms, iterations: final.iterations })}\n\n`))
              sentFinal = true
            }
          }
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: err?.message ?? 'stream failed' })}\n\n`))
        } finally {
          if (!sentFinal) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          }
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'internal' }), { status: 500 })
  }
}

export async function GET() {
  const result = await probeProviders()
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
}
