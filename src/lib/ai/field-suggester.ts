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
  } else if (field === 'content' && entity === 'comments') {
    // Longtext suggestions — short professional phrases
    suggestions.push(
      'Mohon info update terbaru',
      'Sudah saya kerjakan, mohon dicek',
      'Butuh approval untuk lanjut',
      'Ada kendala di lapangan',
      'Tolong follow up ke client',
    )
  } else if (field === 'description' || field === 'notes') {
    suggestions.push(
      'Update progress terbaru',
      'Menunggu konfirmasi client',
      'Sudah selesai sesuai target',
      'Perlu diskusi lebih lanjut',
      'Sesuai jadwal yang direncanakan',
    )
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

import { detectLLMProvider, listAvailableProviders, listCascadeModels, callLLM, parseJSON } from './llm-env'

async function llmSuggest(ctx: SuggestContext): Promise<string[]> {
  // Try cascade: best quality model first, fallback to faster models
  const cascade = listCascadeModels()
  if (cascade.length === 0) return []

  const messages = [
    {
      role: 'system' as const,
      content: 'You are a CRM/operations assistant for a property development company. Generate 3-5 short value suggestions (max 3 words each) for a database field. Respond with JSON array only, no other text.',
    },
    {
      role: 'user' as const,
      content: `Entity: ${ctx.entity}\nField: ${ctx.field}\nPartial input: "${ctx.partial ?? ''}"\nContext: ${JSON.stringify(ctx.context ?? {}).slice(0, 200)}\n\nSuggest 3-5 values (max 30 chars each) as JSON array.`,
    },
  ]

  // Try each (key, model) pair in priority order, fall back on failure
  for (const config of cascade) {
    try {
      const text = await callLLM(config, messages, { maxTokens: 100, temperature: 0.3 })
      const parsed = parseJSON<string[]>(text)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((v) => typeof v === 'string').slice(0, 5)
      }
    } catch {
      // Try next config (key or model)
      continue
    }
  }

  return []
}


