// Multi-provider LLM cascade for Syahfalah AI Copilot.
// Tier-based strategy:
//   Round 1: Best model of each provider in parallel (race).
//   Round 2: 2nd-best model of each provider (race).
//   Round 3: 3rd-best model of each provider in parallel (race).
//   Round 4 (if budget allows): next key on best model per provider.
//
// All models are free-tier (NIM, Groq, OpenRouter free).
// Tool-calling supported via OpenAI-shaped body.

import { getKey, keyCount } from './keys'
import { TIERS, getModelFor } from './model-tier'

export type ProviderName = 'ollama' | 'nim' | 'groq' | 'openrouter'

export type AIContext = unknown

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  name?: string
  tool_calls?: Array<{ id: string; name: string; args: string }>
}

export type ToolDefinition = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: { type: 'object'; properties: Record<string, any>; required: string[] }
  }
}

export interface LLMResponse {
  provider: ProviderName
  model: string
  ms: number
  text?: string
  tool_calls?: Array<{ id: string; name: string; args: string }>
}

interface CallAttempt {
  name: ProviderName
  baseUrl: string
  apiKey?: string
  model: string
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  timeoutMs: number
}

interface ProviderURL { url: string; ms: number }

const PROVIDER_URL: Record<'nim' | 'groq' | 'openrouter', ProviderURL> = {
  nim: { url: 'https://integrate.api.nvidia.com/v1', ms: 6_000 },
  groq: { url: 'https://api.groq.com/openai/v1', ms: 5_000 },
  openrouter: { url: 'https://openrouter.ai/api/v1', ms: 12_000 },
}

const HOSTED_KEYS = ['openrouter', 'nim', 'groq'] as const

async function callProvider(opts: CallAttempt): Promise<LLMResponse | null> {
  const { name, baseUrl, apiKey, model, messages, tools } = opts
  const url = apiKey ? `${baseUrl}/chat/completions` : `${baseUrl}/api/chat`
  const t0 = Date.now()
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const body: Record<string, any> = {
      model,
      messages,
      temperature: 0.2,
      stream: false,
    }
    if (tools) {
      if (apiKey) {
        body.tools = tools
        body.tool_choice = 'auto'
      } else {
        body.tools = tools.map(t => ({
          type: 'function',
          function: { name: t.function.name, description: t.function.description, parameters: t.function.parameters },
        }))
      }
    }
    if (!apiKey) {
      body.options = { temperature: 0.2, num_predict: 500 }
    } else {
      body.max_tokens = 500
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs),
    })
    if (!res.ok) return null
    const j = await res.json()
    const choice = j?.choices?.[0]
    if (!choice) return null
    const msg = choice.message ?? {}
    const tcs = Array.isArray(msg.tool_calls) ? msg.tool_calls : []
    const text = (msg.content ?? '').trim()
    const out: LLMResponse = { provider: name, model, ms: Date.now() - t0 }
    if (tcs.length > 0) {
      out.tool_calls = tcs.map((c: any) => ({
        id: c.id ?? `tc_${Math.random().toString(36).slice(2, 10)}`,
        name: c.function?.name ?? c.name ?? 'unknown',
        args: typeof c.function?.arguments === 'string' ? c.function.arguments : JSON.stringify(c.function?.arguments ?? {}),
      }))
    }
    if (text) out.text = text
    if (!text && tcs.length === 0) return null
    return out
  } catch {
    return null
  }
}

function resolveProvider(p: 'nim' | 'groq' | 'openrouter'): ProviderURL {
  const fallback = PROVIDER_URL[p]
  const envUrl = process.env[`${p.toUpperCase()}_BASE_URL`]
  return { url: envUrl || fallback.url, ms: fallback.ms }
}

function buildAttempt(
  p: 'nim' | 'groq' | 'openrouter',
  modelIndex: number,
  messages: ChatMessage[],
  tools?: ToolDefinition[],
): CallAttempt | null {
  if (keyCount(p) === 0) return null
  const { url, ms } = resolveProvider(p)
  const model = getModelFor(p, modelIndex)
  return {
    name: p,
    baseUrl: url,
    apiKey: getKey(p),
    model,
    messages,
    tools,
    timeoutMs: ms,
  }
}

function buildAttempts(messages: ChatMessage[], tools?: ToolDefinition[]): CallAttempt[] {
  const out: CallAttempt[] = []
  if (process.env.OLLAMA_HOST && process.env.OLLAMA_HOST !== 'off') {
    out.push({
      name: 'ollama',
      baseUrl: process.env.OLLAMA_HOST!,
      apiKey: undefined,
      model: process.env.OLLAMA_MODEL || 'gemma4:12b',
      messages,
      tools,
      timeoutMs: 6_000,
    })
  }
  for (const p of HOSTED_KEYS) {
    const a = buildAttempt(p, 0, messages, tools)
    if (a) out.push(a)
  }
  return out
}

async function runRound(candidates: CallAttempt[], budgetMs: number): Promise<LLMResponse | null> {
  if (candidates.length === 0) return null
  try {
    const winners = await Promise.race([
      Promise.all(candidates.map(a => callProvider(a))),
      new Promise<null>(resolve => setTimeout(() => resolve(null), budgetMs)),
    ])
    if (winners) {
      return (winners as Array<LLMResponse | null>).find(r => r !== null) ?? null
    }
  } catch { /* fall through */ }
  return null
}

// One-shot call with tier-based cascade.
// Race model-tier[0] across all providers. On no-winner, race model-tier[1].
// Then tier[2]. Then start rotating keys on tier[0].
export async function chatOnce(
  messages: ChatMessage[],
  tools?: ToolDefinition[],
  overallTimeoutMs = 18_000,
): Promise<LLMResponse | null> {
  const t0 = Date.now()

  // Round 1: best model per provider
  let budget = Math.max(2_000, overallTimeoutMs - (Date.now() - t0))
  let r = await runRound(buildAttempts(messages, tools), budget)
  if (r) return r

  // Round 2: 2nd-best model per provider
  if (Date.now() - t0 < overallTimeoutMs) {
    budget = overallTimeoutMs - (Date.now() - t0)
    const round2: CallAttempt[] = []
    for (const p of HOSTED_KEYS) {
      const tier = TIERS[p]
      if (tier.length < 2) continue
      const a = buildAttempt(p, 1, messages, tools)
      if (a) round2.push(a)
    }
    if (round2.length > 0) {
      r = await runRound(round2, budget)
      if (r) return r
    }
  }

  // Round 3: 3rd-best model per provider
  if (Date.now() - t0 < overallTimeoutMs) {
    budget = overallTimeoutMs - (Date.now() - t0)
    const round3: CallAttempt[] = []
    for (const p of HOSTED_KEYS) {
      const tier = TIERS[p]
      if (tier.length < 3) continue
      const a = buildAttempt(p, 2, messages, tools)
      if (a) round3.push(a)
    }
    if (round3.length > 0) {
      r = await runRound(round3, budget)
      if (r) return r
    }
  }

  // Round 4: rotate keys on best model only (sequential, short timeout)
  for (const p of HOSTED_KEYS) {
    const kc = keyCount(p)
    if (kc <= 1) continue
    const baseAttempt = buildAttempt(p, 0, messages, tools)
    if (!baseAttempt) continue
    for (let i = 1; i < kc; i++) {
      if (Date.now() - t0 >= overallTimeoutMs) return null
      const out = await callProvider({ ...baseAttempt, apiKey: getKey(p), timeoutMs: 3_500 })
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
  primary_model?: string
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

  for (const p of HOSTED_KEYS) {
    const tier = TIERS[p]
    out.push({
      name: p,
      configured: keyCount(p) > 0,
      reachable: true,
      keys: keyCount(p),
      primary_model: tier[0].model,
    })
  }

  return { providers: out, any_available: out.some(p => p.configured) }
}
