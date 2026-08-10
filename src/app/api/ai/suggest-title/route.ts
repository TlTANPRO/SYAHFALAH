// src/app/api/ai/suggest-title/route.ts
// AI-assisted title suggestions for tasks and projects.
// POST { entity: 'tasks' | 'projects', context: object }
// Returns: { titles: string[], source: 'llm' }
//
// Uses LLM cascade via listCascadeModels() — tries best NIM model first,
// falls back automatically on failure. Max 200 tokens, temperature 0.3.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { listCascadeModels, callLLM, parseJSON } from '@/lib/ai/llm-env'

type Entity = 'tasks' | 'projects'
type Result = { titles: string[]; source: 'llm' }

const ENTITY_SYSTEM: Record<Entity, string> = {
  tasks:
    'You suggest concise task titles (max 80 chars) for a property development team. ' +
    'Use action verbs, be specific, avoid jargon. Respond with JSON only.',
  projects:
    'You suggest concise project titles (max 80 chars) for a property development company. ' +
    'Each title should hint at scope and outcome. Respond with JSON only.',
}

export async function POST(req: NextRequest) {
  try {
    // Auth gate
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { entity, context } = body as {
      entity?: string
      context?: Record<string, unknown>
    }

    if (entity !== 'tasks' && entity !== 'projects') {
      return NextResponse.json(
        { error: "entity must be 'tasks' or 'projects'" },
        { status: 400 },
      )
    }

    const ctxObj = context ?? {}
    if (typeof ctxObj !== 'object' || Array.isArray(ctxObj)) {
      return NextResponse.json({ error: 'context must be an object' }, { status: 400 })
    }

    // Build a compact context string (avoid blowing token budget)
    const ctxStr = JSON.stringify(ctxObj).slice(0, 400)

    const messages = [
      {
        role: 'system' as const,
        content: ENTITY_SYSTEM[entity],
      },
      {
        role: 'user' as const,
        content:
          `Entity: ${entity}\n` +
          `Context: ${ctxStr}\n\n` +
          `Suggest exactly 3 distinct titles as a JSON object: ` +
          `{"titles": ["...","...","..."]}`,
      },
    ]

    const titles = await callCascadeForTitles(messages)

    const result: Result = { titles, source: 'llm' }
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}

/**
 * Try each (key, model) pair in cascade order; parse JSON robustly.
 * Returns an array of up to 3 strings (deduped, length-clipped).
 */
async function callCascadeForTitles(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
): Promise<string[]> {
  const cascade = listCascadeModels()
  if (cascade.length === 0) return []

  for (const config of cascade) {
    try {
      const text = await callLLM(config, messages, { maxTokens: 200, temperature: 0.3 })
      const parsed = parseJSON<{ titles?: unknown } | unknown[]>(text)
      let arr: unknown[] | null = null
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const obj = parsed as { titles?: unknown }
        if (Array.isArray(obj.titles)) arr = obj.titles
      } else if (Array.isArray(parsed)) {
        arr = parsed
      }
      if (arr && arr.length > 0) {
        const titles: string[] = []
        for (const v of arr) {
          if (typeof v === 'string') {
            const trimmed = v.trim().slice(0, 120)
            if (trimmed.length > 0) titles.push(trimmed)
          }
        }
        const unique = Array.from(new Set(titles)).slice(0, 3)
        if (unique.length > 0) return unique
      }
    } catch {
      // Try next (key, model) in cascade
      continue
    }
  }

  return []
}
