// POST /api/ai/test-models — admin-only endpoint to validate every
// model in every tier using first key per provider. Returns a structured
// report of which models work, which time-out, which error.
//
// Safe to call: no mutations, no PII. Just fires one short prompt at
// each model with a 8s timeout. Total walltime ≤ 30s.
//
// Role-gated: owner only.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getKey, keyCount } from '@/lib/ai/keys'
import { TIERS } from '@/lib/ai/model-tier'

interface ModelTest {
  provider: string
  model: string
  ok: boolean
  http_status?: number
  ms?: number
  sample?: string
  error?: string
}

async function testOne(p: 'nim' | 'groq' | 'openrouter', model: string): Promise<ModelTest> {
  const key = getKey(p)
  if (!key) return { provider: p, model, ok: false, error: 'no_key' }
  const url = `https://${p === 'nim' ? 'integrate.api.nvidia.com/v1' :
    p === 'groq' ? 'api.groq.com/openai/v1' :
    'openrouter.ai/api/v1'}/chat/completions`
  const t0 = Date.now()
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a test probe. Reply with the single word "pong" only.' },
          { role: 'user', content: 'ping' },
        ],
        temperature: 0.0,
        max_tokens: 10,
        stream: false,
      }),
      signal: AbortSignal.timeout(8_000),
    })
    const ms = Date.now() - t0
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return { provider: p, model, ok: false, http_status: r.status, ms, error: body.slice(0, 200) }
    }
    const j = await r.json()
    const text = (j?.choices?.[0]?.message?.content ?? '').trim()
    return { provider: p, model, ok: true, http_status: 200, ms, sample: text.slice(0, 60) }
  } catch (e: any) {
    return { provider: p, model, ok: false, ms: Date.now() - t0, error: e?.message?.slice(0, 200) ?? 'timeout' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    if (payload.role !== 'owner') {
      return NextResponse.json({ error: 'owner only' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const targetProvider = (body?.provider ?? 'all') as 'all' | 'nim' | 'groq' | 'openrouter'
    const providers = targetProvider === 'all'
      ? (['nim', 'groq', 'openrouter'] as const)
      : [targetProvider]

    const tests: ModelTest[] = []
    for (const p of providers) {
      if (keyCount(p) === 0) {
        tests.push({ provider: p, model: 'none', ok: false, error: 'no_keys' })
        continue
      }
      for (const t of TIERS[p]) {
        const result = await testOne(p, t.model)
        tests.push(result)
      }
    }
    return NextResponse.json({
      tested_at: new Date().toISOString(),
      tests,
      total: tests.length,
      ok_count: tests.filter(t => t.ok).length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
