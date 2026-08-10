// src/lib/ai/llm-env.ts
// Centralized LLM environment detection.
// Returns the first available provider config (in priority order).
// Provider priority: Groq (fastest, cheapest) → NVIDIA NIM (free tier) → OpenAI (paid).

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

const CONFIGS: Record<LLMConfig['provider'], Omit<LLMConfig, 'provider' | 'apiKey'>> = {
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-8b-instant',
    maxTokens: 200,
    temperature: 0.3,
  },
  nim: {
    baseURL: 'https://integrate.api.nvidia.com/v1',
    model: 'meta/llama-3.1-8b-instruct',
    maxTokens: 200,
    temperature: 0.3,
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    maxTokens: 200,
    temperature: 0.3,
  },
}

const KEY_NAMES: Record<LLMConfig['provider'], string> = {
  groq: 'GROQ_API_KEY',
  nim: 'NVIDIA_NIM_API_KEY',
  openai: 'OPENAI_API_KEY',
}

/**
 * Detect the first available LLM provider based on env vars.
 * Priority order: Groq → NIM → OpenAI.
 * Returns null if no provider is configured.
 */
export function detectLLMProvider(): LLMConfig | null {
  for (const provider of ['groq', 'nim', 'openai'] as const) {
    const apiKey = process.env[KEY_NAMES[provider]]
    if (apiKey) {
      const config = CONFIGS[provider]
      return { provider, apiKey, ...config }
    }
  }
  return null
}

/**
 * Get all available providers (for cascade/multi-provider setups).
 */
export function listAvailableProviders(): LLMConfig[] {
  const available: LLMConfig[] = []
  for (const provider of ['groq', 'nim', 'openai'] as const) {
    const apiKey = process.env[KEY_NAMES[provider]]
    if (apiKey) {
      available.push({ provider, apiKey, ...CONFIGS[provider] })
    }
  }
  return available
}

/**
 * Server-side fetch wrapper for LLM completions.
 * Returns the assistant text or throws on error.
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
 * Tries direct parse, then extracts JSON array/object from text.
 */
export function parseJSON<T = unknown>(text: string): T | null {
  // Direct parse
  try {
    return JSON.parse(text) as T
  } catch {
    // Try to extract JSON array
    const arrayMatch = text.match(/\[[\s\S]*?\]/)
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]) as T
      } catch {
        // Fall through
      }
    }
    // Try to extract JSON object
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
