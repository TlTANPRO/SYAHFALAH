// lib/ai/providers.ts
// Multi-provider LLM cascade for Syahfalah AI Copilot.
// Tries providers in order: Ollama → NIM → Groq → OpenRouter → null.
// Multi-key rotation per hosted provider (env keys comma-separated).
// Returns first successful response. Never throws; returns null on full failure.
// OpenAI-compatible chat/completions shape for all hosted providers.

import { getKey, keyCount } from './keys'

export type ProviderName = 'ollama' | 'nim' | 'groq' | 'openrouter'

export interface AIResult {
  text: string
  provider: ProviderName
  model: string
  ms: number
}

export interface AIContext {
  metrics: {
    leads_total: number
    leads_by_stage: Record<string, number>
    kpis_total: number
    kpis_off_track: number
    overdue_tasks: number
    overdue_consumer_cases: number
    open_maintenance_tickets: number
    overdue_purchase_requests: number
    pending_approvals: number
  }
  recent_blocks: string[]
}

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

async function callProvider(opts: {
  name: ProviderName
  baseUrl: string
  apiKey?: string
  model: string
  messages: ChatMessage[]
  timeoutMs?: number
}): Promise<AIResult | null> {
  const { name, baseUrl, apiKey, model, messages } = opts
  const timeoutMs = opts.timeoutMs ?? 8_000
  const url = apiKey ? `${baseUrl}/chat/completions` : `${baseUrl}/api/chat`
  const t0 = Date.now()
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const body = JSON.stringify(
      apiKey
        ? {
            model,
            messages,
            temperature: 0.2,
            max_tokens: 400,
            stream: false,
          }
        : {
            model,
            messages,
            stream: false,
            options: { temperature: 0.2, num_predict: 400 },
          }
    )

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const j = await res.json()
    // OpenAI-compatible shape
    const text = j?.choices?.[0]?.message?.content?.trim()
    if (!text) return null
    return { text, provider: name, model, ms: Date.now() - t0 }
  } catch {
    return null
  }
}

export async function generateAIAnswer(question: string, ctx: AIContext): Promise<AIResult | null> {
  const messages = buildMessages(question, ctx)

  // 1. Ollama (self-hosted, free, no API key)
  if (process.env.OLLAMA_HOST && process.env.OLLAMA_HOST !== 'off') {
    const out = await callProvider({
      name: 'ollama',
      baseUrl: process.env.OLLAMA_HOST,
      model: process.env.OLLAMA_MODEL || 'gemma4:12b',
      messages,
    })
    if (out) return out
  }

  // 2. NVIDIA NIM (hosted, free tier) — multi-key rotation
  if (keyCount('nim') > 0) {
    const apiKey = getKey('nim')!
    // Try up to NIM keys sequentially with short timeout
    for (let i = 0; i < keyCount('nim'); i++) {
      const k = getKey('nim')!
      const out = await callProvider({
        name: 'nim',
        baseUrl: process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1',
        apiKey: k,
        model: process.env.NIM_MODEL || 'meta/llama-3.1-70b-instruct',
        messages,
        timeoutMs: 8_000,
      })
      if (out) return out
    }
  }

  // 3. Groq — multi-key rotation
  if (keyCount('groq') > 0) {
    for (let i = 0; i < keyCount('groq'); i++) {
      const k = getKey('groq')!
      const out = await callProvider({
        name: 'groq',
        baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
        apiKey: k,
        model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
        messages,
        timeoutMs: 8_000,
      })
      if (out) return out
    }
  }

  // 4. OpenRouter (100+ models incl. free ones) — multi-key rotation
  if (keyCount('openrouter') > 0) {
    for (let i = 0; i < keyCount('openrouter'); i++) {
      const k = getKey('openrouter')!
      const out = await callProvider({
        name: 'openrouter',
        baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        apiKey: k,
        model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-70b-instruct:free',
        messages,
        timeoutMs: 10_000,
      })
      if (out) return out
    }
  }

  // 5. All exhausted → null; caller falls back to deterministic
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

  // Ollama
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

  // NIM/Groq/OpenRouter — just report key counts
  out.push({ name: 'nim', configured: keyCount('nim') > 0, reachable: true, keys: keyCount('nim') })
  out.push({ name: 'groq', configured: keyCount('groq') > 0, reachable: true, keys: keyCount('groq') })
  out.push({ name: 'openrouter', configured: keyCount('openrouter') > 0, reachable: true, keys: keyCount('openrouter') })

  return { providers: out, any_available: out.some(p => p.configured) }
}
