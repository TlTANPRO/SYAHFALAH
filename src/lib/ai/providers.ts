// Multi-provider LLM cascade for Syahfalah AI Copilot.
// Race-first strategy with tool-calling support.
//
// OpenAI-shaped chat/completions body for hosted providers. Ollama
// uses native /api/chat (no API key, but accepts `tools` field too).
// Each call returns either:
//   - { text, provider, model, ms } : plain answer
//   - { tool_calls: [{name, args}], provider, model, ms } : LLM wants a tool
//   - null : provider failed / refused

import { getKey, keyCount } from './keys'

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
        // Ollama native API — different key name
        body.tools = tools.map(t => ({
          type: 'function',
          function: { name: t.function.name, description: t.function.description, parameters: t.function.parameters },
        }))
      }
    }

    if (!apiKey) {
      body.options = { temperature: 0.2, num_predict: 500 }
      delete body.max_tokens
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

interface ProviderDefaults { url: string; model: string; ms: number }
const HOSTED_DEFAULTS: Record<'nim' | 'groq' | 'openrouter', ProviderDefaults> = {
  nim: { url: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.1-70b-instruct', ms: 5_000 },
  groq: { url: 'https://api.groq.com/openai/v1', model: 'llama-3.1-70b-versatile', ms: 5_000 },
  openrouter: { url: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.1-70b-instruct:free', ms: 7_000 },
}

const HOSTED_KEYS = ['nim', 'groq', 'openrouter'] as const

function raceCandidates(messages: ChatMessage[], tools?: ToolDefinition[]): CallAttempt[] {
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
    if (keyCount(p) === 0) continue
    const d = HOSTED_DEFAULTS[p]
    out.push({
      name: p,
      baseUrl: process.env[`${p.toUpperCase()}_BASE_URL`] || d.url,
      apiKey: getKey(p),
      model: process.env[`${p.toUpperCase()}_MODEL`] || d.model,
      messages,
      tools,
      timeoutMs: d.ms,
    })
  }
  return out
}

function remAttempt(p: 'nim' | 'groq' | 'openrouter', messages: ChatMessage[], tools?: ToolDefinition[]): CallAttempt {
  const d = HOSTED_DEFAULTS[p]
  return {
    name: p,
    baseUrl: process.env[`${p.toUpperCase()}_BASE_URL`] || d.url,
    apiKey: getKey(p)!,
    model: process.env[`${p.toUpperCase()}_MODEL`] || d.model,
    messages,
    tools,
    timeoutMs: 3_500,
  }
}

// One-shot call. Returns the first non-null result among providers.
// Used for both deterministic and tool-calling flows.
export async function chatOnce(
  messages: ChatMessage[],
  tools?: ToolDefinition[],
  overallTimeoutMs = 22_000,
): Promise<LLMResponse | null> {
  const deadline = Date.now() + overallTimeoutMs
  const initial = raceCandidates(messages, tools)
  if (initial.length === 0) return null

  try {
    const winners = await Promise.race([
      Promise.all(initial.map(a => callProvider(a))),
      new Promise<null>(resolve => setTimeout(() => resolve(null), overallTimeoutMs)),
    ])
    if (winners) {
      const winner = (winners as Array<LLMResponse | null>).find(r => r !== null)
      if (winner) return winner
    }
  } catch { /* fall through */ }

  for (const provider of HOSTED_KEYS) {
    const kc = keyCount(provider)
    if (kc <= 1) continue
    for (let i = 1; i < kc; i++) {
      if (Date.now() >= deadline) return null
      const out = await callProvider(remAttempt(provider, messages, tools))
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
