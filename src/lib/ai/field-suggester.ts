// src/lib/ai/field-suggester.ts
// Pattern-based + optional LLM-enhanced field suggestions.
// Tries pattern match first (fast, deterministic). Falls back to LLM cascade
// when pattern returns empty AND context is rich enough.

interface SuggestContext {
  entity: string
  field: string
  partial?: string
  context?: Record<string, unknown>
  /** Number of existing values in this column (for pattern uniqueness check) */
  existingValues?: string[]
}

interface Result {
  suggestions: string[]
  source: 'pattern' | 'llm' | 'hybrid'
}

/**
 * Smart field suggester.
 * 1. Tries pattern match (fast, no API)
 * 2. If pattern returns empty + context present, calls LLM cascade
 * 3. Returns combined suggestions
 */
export async function suggestField(ctx: SuggestContext): Promise<Result> {
  const pattern = patternMatch(ctx)

  // If pattern has good coverage, use it
  if (pattern.length >= 3) {
    return { suggestions: filterByPartial(pattern, ctx.partial), source: 'pattern' }
  }

  // Try LLM if pattern is empty/weak
  try {
    const llmSuggestions = await llmSuggest(ctx)
    if (llmSuggestions.length > 0) {
      return {
        suggestions: filterByPartial([...pattern, ...llmSuggestions], ctx.partial),
        source: 'hybrid',
      }
    }
  } catch {
    // LLM failed — fall through to pattern only
  }

  return { suggestions: filterByPartial(pattern, ctx.partial), source: 'pattern' }
}

function patternMatch(ctx: SuggestContext): string[] {
  const { entity, field } = ctx
  const suggestions: string[] = []

  if (field === 'status') {
    suggestions.push('on_track', 'at_risk', 'blocked', 'completed', 'pending', 'in_progress')
  } else if (field === 'priority' || field === 'priority_level') {
    suggestions.push('low', 'medium', 'high', 'urgent')
  } else if (field === 'result' || field === 'outcome') {
    if (entity === 'surveys') {
      suggestions.push('Tertarik', 'Tidak tertarik', 'Akan follow up', 'Sudah closing', 'Tidak response', 'Tertarik dengan tipe lain')
    } else if (entity === 'sp3k') {
      suggestions.push('Disetujui', 'Ditolak', 'Menunggu review', 'Revisi', 'Menunggu tanda tangan')
    } else if (entity === 'bookings') {
      suggestions.push('Booked', 'Cancelled', 'Rescheduled', 'No-show', 'Completed')
    } else if (entity === 'akad') {
      suggestions.push('Selesai', 'Ditunda', 'Dibatalkan', 'Menunggu dokumen', 'Follow up')
    } else {
      suggestions.push('Berhasil', 'Sebagian', 'Gagal', 'Ditunda')
    }
  } else if (field === 'category' || field === 'kategori') {
    suggestions.push('Internal', 'Eksternal', 'Klien', 'Vendor', 'Pemeliharaan')
  } else if (field === 'severity') {
    suggestions.push('low', 'medium', 'high', 'critical')
  } else if (ctx.existingValues && ctx.existingValues.length > 0) {
    return Array.from(new Set(ctx.existingValues)).slice(0, 10)
  }

  return suggestions
}

function filterByPartial(suggestions: string[], partial?: string): string[] {
  if (!partial || !partial.trim()) return suggestions.slice(0, 6)
  const p = partial.toLowerCase()
  return suggestions.filter((s) => s.toLowerCase().includes(p)).slice(0, 6)
}

interface LLMConfig {
  apiKey: string
  baseURL: string
  model: string
}

function getLLMConfig(): LLMConfig | null {
  if (process.env.GROQ_API_KEY) {
    return {
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
      model: 'llama-3.1-8b-instant',
    }
  }
  if (process.env.NVIDIA_NIM_API_KEY) {
    return {
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
      model: 'meta/llama-3.1-8b-instruct',
    }
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    }
  }
  return null
}

async function llmSuggest(ctx: SuggestContext): Promise<string[]> {
  const config = getLLMConfig()
  if (!config) return []

  try {
    const res = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a CRM/operations assistant. Generate 3-5 short value suggestions (max 3 words each) for a database field. Respond with JSON array only, no other text.',
          },
          {
            role: 'user',
            content: `Entity: ${ctx.entity}\nField: ${ctx.field}\nPartial input: "${ctx.partial ?? ''}"\nContext: ${JSON.stringify(ctx.context ?? {}).slice(0, 200)}\n\nSuggest 3-5 values (max 30 chars each) as JSON array.`,
          },
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    })

    if (!res.ok) return []
    const body = await res.json().catch(() => ({}))
    const text = body.choices?.[0]?.message?.content ?? '[]'

    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed.filter((v) => typeof v === 'string').slice(0, 5)
      }
    } catch {
      const match = text.match(/\[[\s\S]*?\]/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string').slice(0, 5)
      }
    }
  } catch {
    // Silent fail — pattern only
  }

  return []
}
