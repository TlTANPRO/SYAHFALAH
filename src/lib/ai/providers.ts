// Multi-provider LLM cascade for Syahfalah AI Copilot.
// Race-first strategy: fire first key of each provider in parallel;
// pick first response. Round 2: sequentially try remaining keys per
// provider only when overall deadline hasn't been hit. Total budget =
// 22s (Vercel Hobby max = 30s, leaves 8s headroom for auth + DB).
//
// All hosted providers use OpenAI-compatible chat/completions shape;
// Ollama uses native /api/chat shape (no API key).

import { getKey, keyCount } from './keys'

export type ProviderName = 'ollama' | 'nim' | 'groq' | 'openrouter'

export interface AIResult {
  text: string
  provider: ProviderName
  model: string
  ms: number
}

// Free-form — accepts BusinessContext or any JSON-serialisable shape.
export type AIContext = unknown

interface ChatMessage { role: 'system' | 'user'; content: string }

function buildMessages(question: string, ctx: AIContext): ChatMessage[] {
  const system = `Kamu adalah Syahfalah AI Copilot. Bantu owner/kepala kantor PT Syahfalah (developer properti di Indonesia) memahami kondisi operasional bisnis: clusters, leads, KPIs, consumer cases (SP3K → SHM), maintenance tickets, purchase orders, approvals.

Aturan:
1. Jawab dalam Bahasa Indonesia (boleh campur Inggris untuk istilah teknis).
2. Jawaban ringkas: bullet points, max 8 bullet.
3. WAJIB pakai data dari konteks di bawah, TIDAK BOleh mengarang angka.
4. Jika data yang diminta tidak tersedia, jawab "Data tidak tersedia untuk itu."
5. Hanya rangkum fakta + highlight anomali. JANGAN berikan saran hukum, finansial, atau medis.

KONTEKS ORGANISASI SAAT INI:
${JSON.stringify(ctx, null, 2)}`
  return [
    { role: 'system', content: system },
    { role: 'user', content: question },
  ]
}

interface CallAttempt {
  name: ProviderName
  baseUrl: string
  apiKey?: string
  model: string
  messages: ChatMessage[]
  timeoutMs: number
}

async function callProvider(opts: CallAttempt): Promise<AIResult | null> {
  const { name, baseUrl, apiKey, model, messages } = opts
  const url = apiKey ? `${baseUrl}/chat/completions` : `${baseUrl}/api/chat`
  const t0 = Date.now()
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const body = JSON.stringify(
      apiKey
        ? { model, messages, temperature: 0.2, max_tokens: 400, stream: false }
        : { model, messages, stream: false, options: { temperature: 0.2, num_predict: 400 } }
    )

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(opts.timeoutMs),
    })
    if (!res.ok) return null
    const j = await res.json()
    const text = j?.choices?.[0]?.message?.content?.trim()
    if (!text) return null
    return { text, provider: name, model, ms: Date.now() - t0 }
  } catch {
    return null
  }
}

interface ProviderDefaults { url: string; model: string; ms: number }
const HOSTED_DEFAULTS: Record<'nim' | 'groq' | 'openrouter', ProviderDefaults> = {
  nim: { url: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.1-70b-instruct', ms: 5_000 },
  groq: { url: 'https://api.groq.com/openai/v1', model: 'llama-3.1-70b-versatile', ms: 5_000 },
  openrouter: { url: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.1-70b-instruct:free', ms: 7_000 },
}

const HOSTED_KEYS = ['nim', 'groq', 'openrouter'] as const

function raceCandidates(messages: ChatMessage[]): CallAttempt[] {
  const out: CallAttempt[] = []
  if (process.env.OLLAMA_HOST && process.env.OLLAMA_HOST !== 'off') {
    out.push({
      name: 'ollama',
      baseUrl: process.env.OLLAMA_HOST!,
      apiKey: undefined,
      model: process.env.OLLAMA_MODEL || 'gemma4:12b',
      messages,
      timeoutMs: 6_000,
    })
  }
  for (const p of HOSTED_KEYS) {
    if (keyCount(p) === 0) continue
    const d = HOSTED_DEFAULTS[p]
    out.push({
      name: p,
      baseUrl: process.env[`${p.toUpperCase()}_BASE_URL`] || d.url,
      apiKey: getKey(p),
      model: process.env[`${p.toUpperCase()}_MODEL`] || d.model,
      messages,
      timeoutMs: d.ms,
    })
  }
  return out
}

function remAttempt(p: 'nim' | 'groq' | 'openrouter', messages: ChatMessage[]): CallAttempt {
  const d = HOSTED_DEFAULTS[p]
  return {
    name: p,
    baseUrl: process.env[`${p.toUpperCase()}_BASE_URL`] || d.url,
    apiKey: getKey(p)!,
    model: process.env[`${p.toUpperCase()}_MODEL`] || d.model,
    messages,
    timeoutMs: 3_500,
  }
}

export async function generateAIAnswer(
  question: string,
  ctx: AIContext,
  overallTimeoutMs = 22_000
): Promise<AIResult | null> {
  const messages = buildMessages(question, ctx)
  const deadline = Date.now() + overallTimeoutMs

  const initial = raceCandidates(messages)
  if (initial.length === 0) return null

  try {
    const winners = await Promise.race([
      Promise.all(initial.map(a => callProvider(a))),
      new Promise<null>(resolve => setTimeout(() => resolve(null), overallTimeoutMs)),
    ])
    if (winners) {
      const winner = (winners as Array<AIResult | null>).find(r => r !== null)
      if (winner) return winner
    }
  } catch { /* fall through */ }

  // Round 2: remaining keys per provider (sequential, short timeout)
  for (const provider of HOSTED_KEYS) {
    const kc = keyCount(provider)
    if (kc <= 1) continue
    for (let i = 1; i < kc; i++) {
      if (Date.now() >= deadline) return null
      const out = await callProvider(remAttempt(provider, messages))
      if (out) return out
    }
  }
  return null
}

export interface ProviderStatus {
  name: ProviderName
  configured: boolean
  reachable?: boolean
  models?: string[]
  keys?: number
  error?: string
}

export async function probeProviders(): Promise<{ providers: ProviderStatus[]; any_available: boolean }> {
  const out: ProviderStatus[] = []

  if (process.env.OLLAMA_HOST && process.env.OLLAMA_HOST !== 'off') {
    const status: ProviderStatus = { name: 'ollama', configured: true, keys: 1 }
    try {
      const r = await fetch(`${process.env.OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(2000) })
      if (r.ok) {
        const j = await r.json()
        status.reachable = true
        status.models = (j.models ?? []).map((m: any) => m.name)
      } else {
        status.reachable = false
        status.error = `HTTP ${r.status}`
      }
    } catch (e: any) {
      status.reachable = false
      status.error = e?.message ?? 'unreachable'
    }
    out.push(status)
  } else out.push({ name: 'ollama', configured: false })

  out.push({ name: 'nim', configured: keyCount('nim') > 0, reachable: true, keys: keyCount('nim') })
  out.push({ name: 'groq', configured: keyCount('groq') > 0, reachable: true, keys: keyCount('groq') })
  out.push({ name: 'openrouter', configured: keyCount('openrouter') > 0, reachable: true, keys: keyCount('openrouter') })

  return { providers: out, any_available: out.some(p => p.configured) }
}
