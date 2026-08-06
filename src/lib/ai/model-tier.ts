// lib/ai/model-tier.ts
// Per-provider ordered model list (best first). On call failure, the
// caller falls to the next model on the same provider BEFORE trying
// the next key.
//
// All models are free-tier / no-cost as of 2026-08. Verified via
// Nvidia NIM / OpenRouter public catalog and Groq production page.

export interface ModelTier {
  provider: 'nim' | 'groq' | 'openrouter'
  model: string
  // approximate quality rank (lower = better, relative within provider)
  rank: number
  // why this model
  reason: string
}

// NVIDIA NIM (free tier). Massive models available:
//   - llama-3.1-nemotron-ultra-253b-v1 is the current best open-source
//     reasoning model for chat; great at structured thinking.
//   - mistral-large-2 is Mistral's flagship.
//   - llama-3.3-70b is solid fallback.
const NIM_TIERS: ModelTier[] = [
  { provider: 'nim', model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', rank: 1,
    reason: '253B params, top-tier reasoning' },
  { provider: 'nim', model: 'mistralai/mistral-large-2-instruct', rank: 2,
    reason: 'Mistral flagship, very strong' },
  { provider: 'nim', model: 'meta/llama-3.3-70b-instruct', rank: 3,
    reason: 'Llama 3.3 70B, well tuned' },
  { provider: 'nim', model: 'nvidia/llama-3.1-nemotron-70b-instruct', rank: 4,
    reason: 'NVIDIA-tuned 70B, fast' },
  { provider: 'nim', model: 'meta/llama-3.1-70b-instruct', rank: 5,
    reason: 'Legacy 70B fallback' },
]

// Groq (free tier). 14 keys × daily quota.
//   - llama-3.3-70b-versatile is Groq's best general-purpose model.
//   - openai/gpt-oss-120b is OpenAI's open model, competitive reasoning.
//   - moonshotai/kimi-k2-instruct is chat-tuned.
const GROQ_TIERS: ModelTier[] = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile', rank: 1,
    reason: 'Groq flagship, 128k context' },
  { provider: 'groq', model: 'openai/gpt-oss-120b', rank: 2,
    reason: 'OpenAI open model, excellent reasoning' },
  { provider: 'groq', model: 'moonshotai/kimi-k2-instruct', rank: 3,
    reason: 'Moonshot K2, chat-tuned' },
  { provider: 'groq', model: 'llama-3.1-70b-versatile', rank: 4,
    reason: 'Legacy 70B fallback' },
]

// OpenRouter (free-tier models). 10 keys.
//   - nvidia/nemotron-3-ultra-550b-a55b:free is the BIGGEST free model
//     in the world right now. 550B params, 1M context.
//   - nvidia/nemotron-3-super-120b-a12b:free is the runner-up.
//   - google/gemma-4-31b-it:free is Google's latest.
const OPENROUTER_TIERS: ModelTier[] = [
  { provider: 'openrouter', model: 'nvidia/nemotron-3-ultra-550b-a55b:free', rank: 1,
    reason: '550B params, 1M context, top reasoning' },
  { provider: 'openrouter', model: 'nvidia/nemotron-3-super-120b-a12b:free', rank: 2,
    reason: '120B, MoE 12B-active, strong reasoning' },
  { provider: 'openrouter', model: 'google/gemma-4-31b-it:free', rank: 3,
    reason: 'Google Gemma 4, latest family' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.1-70b-instruct:free', rank: 4,
    reason: 'Legacy 70B fallback (the old default)' },
]

export const TIERS: Record<'nim' | 'groq' | 'openrouter', ModelTier[]> = {
  nim: NIM_TIERS,
  groq: GROQ_TIERS,
  openrouter: OPENROUTER_TIERS,
}

export function getModelFor(provider: 'nim' | 'groq' | 'openrouter', index = 0): string {
  const list = TIERS[provider]
  return list[Math.min(index, list.length - 1)].model
}
