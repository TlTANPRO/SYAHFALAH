// src/lib/ai/llm-env.ts
// Centralized LLM environment detection + cascade fallback.
// PROVIDER PRIORITY ORDER (best quality first):
// 1. NVIDIA NIM — best quality + free tier (12 keys available)
// 2. Groq — fast but blocked by Cloudflare (keys blocked in current env)
// 3. OpenAI — paid fallback
//
// MODEL PRIORITY (within NIM):
// 1. nvidia/nemotron-3-ultra-550b-a55b — best quality (rate-limited 503 sometimes)
// 2. nvidia/llama-3.3-nemotron-super-49b-v1 — fastest quality (1-2s)
// 3. meta/llama-3.1-70b-instruct — stable (4-8s)
// 4. meta/llama-3.1-8b-instruct — fastest fallback (0.7-1s)

export interface LLMConfig {
  provider: 'groq' | 'nim' | 'openai'
  apiKey: string
  baseURL: string
  model: string
  /** Max tokens to request (per-call budget) */
  maxTokens: number
  /** Default temperature */
  temperature: number
}

const NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1'

// NIM model priority (best first)
const NIM_MODEL_PRIORITY = [
  'nvidia/nemotron-3-ultra-550b-a55b',  // 550b ultra (best)
  'nvidia/llama-3.3-nemotron-super-49b-v1',  // 49b optimized (fastest quality)
  'meta/llama-3.1-70b-instruct',  // well-tested 70b
  'meta/llama-3.1-8b-instruct',  // 8b fallback (always works)
] as const

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const OPENAI_BASE_URL = 'https://api.openai.com/v1'

const KEY_NAMES: Record<LLMConfig['provider'], string[]> = {
  groq: ['GROQ_API_KEY'],
  nim: ['NIM_API_KEY', 'NIM_API_KEY_2', 'NIM_API_KEY_3'],
  openai: ['OPENAI_API_KEY'],
}

const NIM_KEYS = [
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
]

interface ProviderEntry {
  provider: 'groq' | 'nim' | 'openai'
  apiKey: string
  baseURL: string
  defaultModel: string
}

const PROVIDER_CONFIGS: Record<LLMConfig['provider'], Omit<ProviderEntry, 'apiKey' | 'defaultModel'>> = {
  groq: { provider: 'groq', baseURL: GROQ_BASE_URL },
  nim: { provider: 'nim', baseURL: NIM_BASE_URL },
  openai: { provider: 'openai', baseURL: OPENAI_BASE_URL },
}

const PROVIDER_DEFAULT_MODEL: Record<LLMConfig['provider'], string> = {
  groq: 'llama-3.1-70b-versatile',
  nim: 'nvidia/llama-3.3-nemotron-super-49b-v1',  // Best stable Nim model
  openai: 'gpt-4o-mini',
}

/**
 * Get all available provider configs (cascade order).
 * Returns all providers with valid keys, in priority order.
 */
export function listAvailableProviders(): LLMConfig[] {
  const all: LLMConfig[] = []

  // NIM first (best quality)
  const nimKeys = [process.env.NIM_API_KEY, process.env.NIM_API_KEY_2, process.env.NIM_API_KEY_3].filter(Boolean) as string[]
  // Add bundled keys (always, to ensure fallback)
  for (const bundledKey of NIM_KEYS) {
    if (!nimKeys.includes(bundledKey)) {
      nimKeys.push(bundledKey)
    }
  }
  for (const apiKey of nimKeys) {
    all.push({
      provider: 'nim',
      apiKey,
      baseURL: NIM_BASE_URL,
      model: PROVIDER_DEFAULT_MODEL.nim,
      maxTokens: 200,
      temperature: 0.3,
    })
  }

  // Groq second
  if (process.env.GROQ_API_KEY) {
    all.push({
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      baseURL: GROQ_BASE_URL,
      model: PROVIDER_DEFAULT_MODEL.groq,
      maxTokens: 200,
      temperature: 0.3,
    })
  }

  // OpenAI third
  if (process.env.OPENAI_API_KEY) {
    all.push({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: OPENAI_BASE_URL,
      model: PROVIDER_DEFAULT_MODEL.openai,
      maxTokens: 200,
      temperature: 0.3,
    })
  }

  return all
}

/**
 * Get all available models for cascade (best quality first).
 */
export function listCascadeModels(): LLMConfig[] {
  const all: LLMConfig[] = []
  const nimKeys = [process.env.NIM_API_KEY, process.env.NIM_API_KEY_2, process.env.NIM_API_KEY_3].filter(Boolean) as string[]
  if (nimKeys.length === 0) {
    nimKeys.push(...NIM_KEYS)
  }

  // Add bundled NIM keys as additional cascade entries (after env keys)
  for (const bundledKey of NIM_KEYS) {
    if (!nimKeys.includes(bundledKey)) {
      nimKeys.push(bundledKey)
    }
  }

  // Generate cascade: each (key, model) pair
  for (const apiKey of nimKeys) {
    for (const model of NIM_MODEL_PRIORITY) {
      all.push({
        provider: 'nim',
        apiKey,
        baseURL: NIM_BASE_URL,
        model,
        maxTokens: 200,
        temperature: 0.3,
      })
    }
  }

  // Groq + OpenAI as final fallback
  if (process.env.GROQ_API_KEY) {
    all.push({
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      baseURL: GROQ_BASE_URL,
      model: PROVIDER_DEFAULT_MODEL.groq,
      maxTokens: 200,
      temperature: 0.3,
    })
  }
  if (process.env.OPENAI_API_KEY) {
    all.push({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: OPENAI_BASE_URL,
      model: PROVIDER_DEFAULT_MODEL.openai,
      maxTokens: 200,
      temperature: 0.3,
    })
  }

  return all
}

/**
 * Detect first available LLM provider.
 * Returns null if no provider is configured.
 */
export function detectLLMProvider(): LLMConfig | null {
  const providers = listAvailableProviders()
  return providers[0] ?? null
}

/**
 * Server-side fetch wrapper for LLM completions.
 */
export async function callLLM(
  config: LLMConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const res = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: opts?.maxTokens ?? config.maxTokens,
      temperature: opts?.temperature ?? config.temperature,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown')
    throw new Error(`LLM call failed: ${res.status} ${errText.slice(0, 200)}`)
  }

  const body = await res.json().catch(() => ({}))
  return body.choices?.[0]?.message?.content ?? ''
}

/**
 * Parse JSON from LLM response.
 */
export function parseJSON<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    const arrayMatch = text.match(/\[[\s\S]*?\]/)
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]) as T
      } catch {
        // Fall through
      }
    }
    const objMatch = text.match(/\{[\s\S]*?\}/)
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]) as T
      } catch {
        // Fall through
      }
    }
  }
  return null
}
