// lib/ai/stream.ts
// Streaming chat completion. Wraps OpenAI-shaped SSE responses from
// providers and yields text chunks.
//
// Falls back to non-streaming if the provider doesn't support stream.

import { ChatMessage, ToolDefinition } from './providers'

const PROVIDER_URL: Record<string, { url: string }> = {
  nim: { url: 'https://integrate.api.nvidia.com/v1' },
  groq: { url: 'https://api.groq.com/openai/v1' },
  openrouter: { url: 'https://openrouter.ai/api/v1' },
}

const HOSTED_KEYS = ['openrouter', 'nim', 'groq'] as const

export async function* streamChatCompletion(
  messages: ChatMessage[],
  tools?: ToolDefinition[],
): AsyncGenerator<string> {
  // Try each provider sequentially; yield from first that succeeds.
  for (const p of HOSTED_KEYS) {
    let worked = false
    try {
      for await (const chunk of tryStream(p, messages, tools)) {
        worked = true
        yield chunk
      }
    } catch { /* continue */ }
    // If we got here without working, try next provider; if worked=true, we streamed
    if (worked) return
  }
  // Fallback: non-streaming (synthesize via OpenAI-shaped body)
  // (Real fallback is in the calling code.)
  // If we reach here, no provider worked.
  return
}

async function* tryStream(
  p: 'nim' | 'groq' | 'openrouter',
  messages: ChatMessage[],
  tools?: ToolDefinition[],
): AsyncGenerator<string, boolean, void> {
  const keys = (process.env[`${p.toUpperCase()}_API_KEY`] ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (keys.length === 0) return false

  const cfg = PROVIDER_URL[p]
  if (!cfg) return false

  const model = pickModel(p)
  const body: any = {
    model,
    messages,
    temperature: 0.2,
    stream: true,
    max_tokens: 1024,
  }
  if (tools) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${keys[0]}`,
  }

  let res: Response
  try {
    res = await fetch(`${cfg.url}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    return false
  }
  if (!res.ok || !res.body) return false

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const exact = line.trim()
      if (!exact || !exact.startsWith('data:')) continue
      const payload = exact.slice(5).trim()
      if (payload === '[DONE]') return true
      try {
        const j = JSON.parse(payload)
        const chunk = j?.choices?.[0]?.delta?.content
        if (chunk) yield chunk
      } catch { /* ignore parse */ }
    }
  }
  return true
}

function pickModel(p: 'nim' | 'groq' | 'openrouter'): string {
  const map: Record<string, string> = {
    openrouter: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    nim: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
    groq: 'llama-3.3-70b-versatile',
  }
  return map[p]
}
