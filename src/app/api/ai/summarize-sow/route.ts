// src/app/api/ai/summarize-sow/route.ts
// AI-assisted SOW (Scope of Work) summarization.
// POST { sowText: string }
// Returns: { summary: string, source: 'llm' }
//
// Uses LLM cascade via listCascadeModels() — tries best NIM model first,
// falls back automatically on failure. Max 200 tokens, temperature 0.3.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { listCascadeModels, callLLM, parseJSON } from '@/lib/ai/llm-env'

type Result = { summary: string; source: 'llm' }

const MAX_INPUT_CHARS = 6000 // hard cap to stay well within token budget

export async function POST(req: NextRequest) {
  try {
    // Auth gate
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { sowText } = body as { sowText?: unknown }

    if (typeof sowText !== 'string' || sowText.trim().length === 0) {
      return NextResponse.json({ error: 'sowText (non-empty string) required' }, { status: 400 })
    }

    const trimmed = sowText.trim().slice(0, MAX_INPUT_CHARS)

    const messages = [
      {
        role: 'system' as const,
        content:
          'You summarize Scope of Work (SOW) documents for a property development team. ' +
          'Produce a concise 2-3 sentence summary (max 60 words) capturing scope, deliverables, ' +
          'and timeline. Respond with JSON only.',
      },
      {
        role: 'user' as const,
        content:
          `Summarize this SOW in 2-3 sentences as a JSON object: ` +
          `{"summary": "..."}\n\nSOW:\n${trimmed}`,
      },
    ]

    const summary = await callCascadeForSummary(messages)

    if (!summary) {
      return NextResponse.json({ error: 'all cascade models failed' }, { status: 502 })
    }

    const result: Result = { summary, source: 'llm' }
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

/**
 * Try each (key, model) pair in cascade order; parse JSON robustly.
 * Returns a trimmed 2-3 sentence string, or empty string on total failure.
 */
async function callCascadeForSummary(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const cascade = listCascadeModels()
  if (cascade.length === 0) return ''

  for (const config of cascade) {
    try {
      const text = await callLLM(config, messages, { maxTokens: 200, temperature: 0.3 })
      const parsed = parseJSON<{ summary?: unknown } | string>(text)

      let raw: string | null = null
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const obj = parsed as { summary?: unknown }
        if (typeof obj.summary === 'string') raw = obj.summary
      } else if (typeof parsed === 'string') {
        raw = parsed
      }

      // Last-resort fallback: model returned prose only (no JSON). Accept it
      // if it's a short string and not obviously JSON-shaped.
      if (!raw && text.trim().length > 0) {
        const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
        if (!cleaned.startsWith('{') && !cleaned.startsWith('[') && cleaned.length <= 500) {
          raw = cleaned
        }
      }

      if (raw && raw.trim().length > 0) {
        return raw.trim().slice(0, 600)
      }
    } catch {
      // Try next (key, model) in cascade
      continue
    }
  }

  return ''
}
