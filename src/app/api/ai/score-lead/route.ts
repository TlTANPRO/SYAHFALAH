// src/app/api/ai/score-lead/route.ts
// AI-assisted lead scoring.
// POST { leadData: object }
// Returns: { score: number (0-100), reasoning: string, next_action: string, source: 'llm' }
//
// Uses LLM cascade via listCascadeModels() — tries best NIM model first,
// falls back automatically on failure. Max 200 tokens, temperature 0.3.
//
// Lead shape (any subset — the more context, the better the score):
//   { name, phone, email, stage, source, estimated_value_rupiah,
//     interested_unit_type, contacted_at, surveyed_at, booked_at, notes }

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { listCascadeModels, callLLM, parseJSON } from '@/lib/ai/llm-env'

type ScoreResult = {
  score: number
  reasoning: string
  next_action: string
  source: 'llm'
}

const MAX_INPUT_CHARS = 2000

export async function POST(req: NextRequest) {
  try {
    // Auth gate
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { leadData } = body as { leadData?: unknown }

    if (!leadData || typeof leadData !== 'object' || Array.isArray(leadData)) {
      return NextResponse.json({ error: 'leadData (object) required' }, { status: 400 })
    }

    const leadStr = JSON.stringify(leadData).slice(0, MAX_INPUT_CHARS)

    const messages = [
      {
        role: 'system' as const,
        content:
          'You score sales leads for an Indonesian property development company. ' +
          'Output a JSON object with: score (integer 0-100, higher = hotter lead), ' +
          'reasoning (1-2 short sentences in Bahasa Indonesia), ' +
          'next_action (one concrete next step, Bahasa Indonesia, max 10 words). ' +
          'Consider: pipeline stage, response timing, value, source quality, engagement signals. ' +
          'Respond with JSON only.',
      },
      {
        role: 'user' as const,
        content:
          `Score this lead. Respond as JSON: ` +
          `{"score": <0-100>, "reasoning": "...", "next_action": "..."}\n\n` +
          `Lead data:\n${leadStr}`,
      },
    ]

    const result = await callCascadeForScore(messages)

    if (!result) {
      return NextResponse.json({ error: 'all cascade models failed' }, { status: 502 })
    }

    return NextResponse.json({ ...result, source: 'llm' } satisfies ScoreResult)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

/**
 * Try each (key, model) pair in cascade order; parse JSON robustly.
 * Returns a validated { score, reasoning, next_action } or null on total failure.
 */
async function callCascadeForScore(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
): Promise<Omit<ScoreResult, 'source'> | null> {
  const cascade = listCascadeModels()
  if (cascade.length === 0) return null

  for (const config of cascade) {
    try {
      const text = await callLLM(config, messages, { maxTokens: 200, temperature: 0.3 })
      const parsed = parseJSON<Record<string, unknown>>(text)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue

      const rawScore = parsed.score
      const scoreNum =
        typeof rawScore === 'number'
          ? rawScore
          : typeof rawScore === 'string'
            ? Number(rawScore)
            : NaN
      if (!Number.isFinite(scoreNum)) continue

      const score = Math.max(0, Math.min(100, Math.round(scoreNum)))

      const reasoning =
        typeof parsed.reasoning === 'string' ? parsed.reasoning.trim().slice(0, 400) : ''
      const nextAction =
        typeof parsed.next_action === 'string' ? parsed.next_action.trim().slice(0, 120) : ''

      if (!reasoning && !nextAction) continue

      return {
        score,
        reasoning: reasoning || 'Tidak ada reasoning dari model.',
        next_action: nextAction || 'Follow up dengan lead.',
      }
    } catch {
      // Try next (key, model) in cascade
      continue
    }
  }

  return null
}
