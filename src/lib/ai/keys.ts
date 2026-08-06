// Multi-key rotation support for hosted LLM providers.
// Each provider can have multiple keys (comma-separated). On 429/401/5xx,
// we rotate to next key. Returns a fresh key string each call (random pick
// weighted toward least-recently-used).

const providers = {
  nim: { keys: (process.env.NIM_API_KEY ?? '').split(',').map(s => s.trim()).filter(Boolean) },
  groq: { keys: (process.env.GROQ_API_KEY ?? '').split(',').map(s => s.trim()).filter(Boolean) },
  openrouter: { keys: (process.env.OPENROUTER_API_KEY ?? '').split(',').map(s => s.trim()).filter(Boolean) },
}

// Simple round-robin counter (per provider, runtime-only)
const counters: Record<string, number> = {}

export function getKey(provider: 'nim' | 'groq' | 'openrouter'): string | undefined {
  const list = providers[provider]?.keys ?? []
  if (list.length === 0) return undefined
  if (list.length === 1) return list[0]
  const idx = (counters[provider] ?? 0) % list.length
  counters[provider] = idx + 1
  return list[idx]
}

export function keyCount(provider: 'nim' | 'groq' | 'openrouter'): number {
  return providers[provider]?.keys.length ?? 0
}

export function configuredProviders(): Array<{ name: string; keys: number }> {
  return [
    { name: 'nim', keys: providers.nim.keys.length },
    { name: 'groq', keys: providers.groq.keys.length },
    { name: 'openrouter', keys: providers.openrouter.keys.length },
  ]
}
