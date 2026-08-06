// lib/ai/agent.ts
// Syahfalah AI Copilot agent — plan + tool loop.
// Strategy:
//  1. Load internal business context (lib/ai/context.ts).
//  2. Build user message + system prompt + tool definitions.
//  3. Send to LLM cascade (lib/ai/providers.ts).
//  4. If LLM returns tool_calls: run tools, append results, loop.
//  5. Cap at MAX_AGENT_ITERATIONS iterations + AGENT_BUDGET_MS total.
//  6. On timeout / final answer: return text + traces.
//  7. If everything fails: fallback to deterministicSlice().

import { ChatMessage, chatOnce, LLMResponse } from './providers'
import { getToolDefinitions, runTool } from './tools'
import { loadBusinessContext, deterministicSlice, BusinessContext } from './context'

const AGENT_BUDGET_MS = 18_000  // hard cap total wall time
const MAX_LLM_STEPS = 4         // 1 init + 3 tool-call rounds

export interface AgentStep {
  kind: 'llm' | 'tool' | 'final' | 'fallback'
  provider?: string
  model?: string
  ms?: number
  text?: string
  tool_name?: string
  tool_args?: string
  tool_result?: string
  tool_ok?: boolean
}

export interface AgentResult {
  answer: string
  provider: string
  available: boolean
  steps: AgentStep[]
  total_ms: number
  iterations: number
  context: BusinessContext
}

function buildSystemPrompt(ctx: BusinessContext): string {
  const compact = JSON.stringify(ctx)
  return `Kamu adalah Syahfalah AI Copilot. PT Syahfalah adalah developer properti di Indonesia yang mengelola clusters, leads, KPIs, consumer cases (SP3K → SHM), maintenance, purchase orders, dan approvals.

ATURAN KETAT:
1. Jawab dalam Bahasa Indonesia (boleh campur Inggris untuk istilah teknis).
2. Jawaban RINGKAS: bullet points, max 8 bullet.
3. Memakai data dari konteks internal jika tersedia. Untuk info eksternal (berita, riset, tren global, social media), GUNAKAN tools (fetch_url, fetch_rss, fetch_oembed, search_duckduckgo).
4. Jika data TIDAK tersedia di konteks DAN tool gagal, jawab "Data tidak tersedia".
5. JANGAN mengarang angka. JANGAN kasih saran hukum, finansial, atau medis.
6. Untuk pertanyaan yang membutuhkan info dari luar (misal "tren properti 2026" / "berita tentang suku bunga BI"), PANGGIL tool yang sesuai. Untuk pertanyaan internal saja, langsung jawab.
7. Setiap kali tool return error, laporkan pada user dengan Bahasa Indonesia.

KONTEKS INTERNAL SAAT INI (JSON):
${compact}`
}

function shouldUseTools(question: string): boolean {
  // Heuristic: short "show" question about internal data → no tools needed.
  const q = question.toLowerCase()
  const external = /(tren|berita|news|artikel|riset|riset|outlook|global|2025|2026|2027|suku bunga|bi rate|inflasi|ekonomi|properti jakarta|developer lain|competitor|video|youtube|tiktok|instagram|ig|twitter|x\.com|github|repo)/i
  if (external.test(q)) return true
  // URL in question → definitely need tools
  if (/https?:\/\//i.test(question)) return true
  return false
}

export async function runAgent(question: string): Promise<AgentResult> {
  const t0 = Date.now()
  const context = await loadBusinessContext()
  const ctxMs = Date.now() - t0

  // Decide whether to enable tools. If question is purely internal, skip
  // tools to save tokens AND speed up cascade.
  const enableTools = shouldUseTools(question)
  const tools = enableTools ? getToolDefinitions() : undefined

  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(context) },
    { role: 'user', content: question },
  ]

  const steps: AgentStep[] = []
  let lastResponse: LLMResponse | null = null
  let iterations = 0

  for (let i = 0; i < MAX_LLM_STEPS; i++) {
    if (Date.now() - t0 >= AGENT_BUDGET_MS) break
    iterations = i + 1
    const remaining = Math.max(2_000, AGENT_BUDGET_MS - (Date.now() - t0))
    const r = await chatOnce(messages, tools, remaining)
    if (!r) break
    lastResponse = r

    if (r.tool_calls && r.tool_calls.length > 0) {
      steps.push({
        kind: 'llm',
        provider: r.provider,
        model: r.model,
        ms: r.ms,
        text: r.text,
        tool_name: r.tool_calls.map(t => t.name).join(','),
        tool_args: r.tool_calls.map(t => t.args).join(' | '),
      })
      // Append assistant message with tool_calls
      messages.push({
        role: 'assistant',
        content: r.text ?? '',
        tool_calls: r.tool_calls.map(t => ({ id: t.id, name: t.name, args: t.args })),
      })
      // Run each tool
      for (const tc of r.tool_calls) {
        if (Date.now() - t0 >= AGENT_BUDGET_MS) break
        const toolResult = await runTool(tc.name, tc.args)
        const toolMsg = toolResult.ok
          ? (toolResult.summary || '(empty)')
          : `Error: ${toolResult.error ?? 'unknown'} — ${toolResult.summary ?? ''}`
        steps.push({
          kind: 'tool',
          tool_name: tc.name,
          tool_args: tc.args,
          tool_result: toolMsg.slice(0, 500),
          tool_ok: toolResult.ok,
        })
        messages.push({
          role: 'tool',
          name: tc.name,
          tool_call_id: tc.id,
          content: toolMsg,
        })
      }
      // Loop again with appended tool results
      continue
    }

    // Plain text answer — done
    if (r.text) {
      steps.push({
        kind: 'final',
        provider: r.provider,
        model: r.model,
        ms: r.ms,
        text: r.text,
      })
      return {
        answer: r.text,
        provider: r.provider,
        available: true,
        steps,
        total_ms: Date.now() - t0,
        iterations,
        context,
      }
    }
    break
  }

  // No usable answer — fallback to deterministic slice
  const fb = deterministicSlice(question, context)
  steps.push({ kind: 'fallback', text: fb, ms: ctxMs })
  return {
    answer: fb,
    provider: 'deterministic',
    available: !!lastResponse,
    steps,
    total_ms: Date.now() - t0,
    iterations,
    context,
  }
}
