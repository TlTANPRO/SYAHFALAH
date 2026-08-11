// src/app/api/ai/suggest-field/route.ts
// AI-assisted field suggestions for InlineEdit / FieldForm.
// POST { entity: string, field: string, context: object, partial?: string }
// Returns: { suggestions: string[], source: 'pattern' | 'llm' | 'hybrid' }

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { suggestField } from '@/lib/ai/field-suggester'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { entity, field, partial, context } = body as {
      entity?: string
      field?: string
      partial?: string
      context?: Record<string, unknown>
    }

    if (!entity || !field) {
      return NextResponse.json({ error: 'entity + field required' }, { status: 400 })
    }

    // Delegate to AI suggester (pattern → LLM cascade)
    // Hard ceiling: 22s (under Vercel 30s maxDuration)
    const controller = new AbortController()
    const ceiling = setTimeout(() => controller.abort(), 22_000)
    let result
    try {
      result = await Promise.race([
        suggestField({
          entity,
          field,
          partial,
          context: context as Record<string, unknown> | undefined,
        }),
        new Promise<never>((_, rej) => controller.signal.addEventListener('abort', () => rej(new Error('suggest-field timeout (22s)')))),
      ])
    } finally {
      clearTimeout(ceiling)
    }

    return NextResponse.json({
      suggestions: result.suggestions,
      source: result.source,
      field,
      entity,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
