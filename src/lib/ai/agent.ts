// lib/ai/agent.ts
// TITAN — minimal fast-path agent. Single LLM call.
// Strategy:
//   1. Detect intent (1 regex pass, ~0ms).
//   2. If external/intent: parallel-fetch tools (<2s total).
//   3. Combine: short summary + tool evidence + question → 1 LLM call.
//   4. Return text.
//
// No multi-round, no synthesis pass, no LLM tool-calling. The cascade
// (multi-provider) gives reliability; this single-call architecture
// gives speed (~6-10s total instead of 18-22s).

import { ChatMessage, chatOnce, LLMResponse } from './providers'
import { web_search, youtube_trending, runTool } from './tools'
import { loadBusinessSummary, formatSummary } from './context-summary'

const AGENT_BUDGET_MS = 18_000

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentStep {
  kind: 'intent' | 'ctx' | 'tool' | 'llm' | 'final' | 'fallback'
  provider?: string
  model?: string
  ms?: number
  text?: string
  tool_name?: string
  tool_args?: string
  tool_result?: string
  tool_ok?: boolean
  intent?: string
}

export interface AgentResult {
  answer: string
  provider: string
  available: boolean
  steps: AgentStep[]
  total_ms: number
  iterations: number
}

export type QuestionIntent = 'internal' | 'url' | 'music' | 'news' | 'business' | 'social' | 'chat'

function detectIntent(q: string): QuestionIntent {
  const low = q.toLowerCase()
  if (/https?:\/\//.test(q)) return 'url'
  if (/\b(syahfalah|leads?|kpi|cluster|project|booking|sp3k|akad|maintenance|cashflow|approval|task|consumer|cabang|properti kita|perusahaan kita)\b/.test(low)) return 'internal'
  if (/\b(lagu|musik|band|artis|song|music|charts|billboard|spotify)\b/.test(low)) return 'music'
  if (/\b(berita|news|hari ini|minggu ini|inflasi|bi rate|suku bunga|rupiah|ekonomi|politik|ihsg|terbaru)\b/.test(low)) return 'news'
  if (/\b(developer|perusahaan|properti|real estate|kontraktor|arsitek|listing|konstruksi|software house|software developer|programmer|dev |tech company)\b/.test(low)) return 'business'
  if (/\b(tiktok|instagram|ig|reels|tweet|twitter|x\.com|youtube|youtu\.be)\b/.test(low)) return 'social'
  if (q.length < 6) return 'chat'
  return 'chat'
}

const STOP = new Set([
  'cari', 'tolong', 'beri', 'kasih', 'info', 'tentang', 'dong', 'ya', 'sih', 'deh',
  'platform', 'khususnya', 'di', 'yang', 'dan', 'atau', 'ke', 'dari', 'untuk',
  'adalah', 'apa', 'siapa', 'kapan', 'dimana', 'bagaimana', 'gmana', 'gimana',
  'how', 'why', 'what', 'who', 'where', 'when', 'the', 'a', 'an', 'in', 'on',
  'at', 'to', 'for', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'top', '10', 'best', 'terbaik', 'sebutkan', 'sebut', 'berikan', 'tampilkan',
  'list', 'daftar', 'show', 'tahun', '2025', '2026', '2024', '2027',
  'sekarang', 'saat', 'ini', 'kita', 'aku', 'saya', 'kamu', 'anda',
  'tolong', 'tolong', 'mau', 'bisa', 'bagaimana', 'gimana',
])

function extractQuery(q: string): string {
  const low = q.toLowerCase()
  const tokens = low.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t && !STOP.has(t) && t.length > 1)
  return tokens.slice(0, 6).join(' ').trim() || low.slice(0, 60)
}

function buildSystemPrompt(intent: QuestionIntent, summary: string): string {
  return `Kamu TITAN, AI Copilot PT Syahfalah. Personality: tajam, analitis, hangat, banyak referensi. Bukan template-formatter.

CARA BICARA:
- Bahasa Indonesia natural, boleh istilah teknis Inggris.
- Panjang: yes/no → 1 kalimat. Analitis → 3-5 bullet. Breakdown → max 8 bullet.
- JANGAN pakai pembuka template ("Berikut adalah...", "Berdasarkan data..."). Langsung to the point.
- JANGAN mengarang angka. Kalau tidak yakin, bilang "Saya tidak yakin".
- BOLEH kasih opini operasional. JANGAN kasih saran hukum/medis/finansial personal.

${intent === 'internal' ? `SNAPSHOT BISNIS:\n${summary}\n` : ''}
${intent !== 'internal' ? 'Kamu TIDAK punya akses internet. Jawab apa yang kamu tahu. Kalau data real-time dibutuhkan, bilang "Saya tidak punya akses internet".' : ''}`
}

export async function runAgent(
  question: string,
  history: ConversationTurn[] = [],
): Promise<AgentResult> {
  const t0 = Date.now()
  const steps: AgentStep[] = []
  const intent = detectIntent(question)
  steps.push({ kind: 'intent', intent })

  const searchQuery = extractQuery(question)
  let summary = ''
  let evidence = ''

  // Always run context + relevant tools in parallel with 4s hard cap
  const TOOL_TIMEOUT_MS = 4_000
  const toolCall = <T>(p: Promise<T>): Promise<T | null> =>
    Promise.race([
      p,
      new Promise<null>(resolve => setTimeout(() => resolve(null), TOOL_TIMEOUT_MS)),
    ])

  const parallel: Array<Promise<void>> = []

  if (intent === 'internal') {
    parallel.push(toolCall(loadBusinessSummary()).then(s => {
      if (s) { summary = formatSummary(s); steps.push({ kind: 'ctx', text: summary }) }
    }))
  } else if (intent === 'url') {
    const urlMatch = question.match(/https?:\/\/[^\s]+/)?.[0]
    if (urlMatch) {
      parallel.push(toolCall(runTool('fetch_url', JSON.stringify({ url: urlMatch, max_chars: 4000 }))).then(r => {
        if (!r) { steps.push({ kind: 'tool', tool_name: 'fetch_url', tool_ok: false, tool_result: 'timeout' }); return }
        steps.push({ kind: 'tool', tool_name: 'fetch_url', tool_ok: r.ok, tool_result: r.ok ? r.summary.slice(0, 800) : (r.error ?? 'failed') })
        if (r.ok) evidence = `== DATA DARI URL ==\n${r.summary.slice(0, 1500)}`
      }))
    }
  } else if (intent === 'music') {
    parallel.push(
      toolCall(runTool('web_search', JSON.stringify({ query: searchQuery, max_results: 3 }))).then(r => {
        if (!r) { steps.push({ kind: 'tool', tool_name: 'web_search', tool_ok: false, tool_result: 'timeout' }); return }
        steps.push({ kind: 'tool', tool_name: 'web_search', tool_ok: r.ok, tool_result: r.ok ? r.summary.slice(0, 500) : (r.error ?? 'failed') })
        if (r.ok) evidence += (evidence ? '\n\n' : '') + `== SEARCH (${searchQuery}) ==\n${r.summary.slice(0, 1000)}`
      }),
      toolCall(runTool('youtube_trending', JSON.stringify({ region: 'ID' }))).then(r => {
        if (!r) { steps.push({ kind: 'tool', tool_name: 'youtube_trending', tool_ok: false, tool_result: 'timeout' }); return }
        steps.push({ kind: 'tool', tool_name: 'youtube_trending', tool_ok: r.ok, tool_result: r.ok ? r.summary.slice(0, 500) : (r.error ?? 'failed') })
        if (r.ok) evidence += (evidence ? '\n\n' : '') + `== YOUTUBE TRENDING INDONESIA ==\n${r.summary.slice(0, 800)}`
      }),
    )
  } else if (intent === 'news' || intent === 'business' || intent === 'social') {
    parallel.push(
      toolCall(runTool('web_search', JSON.stringify({ query: searchQuery, max_results: 5 }))).then(r => {
        if (!r) { steps.push({ kind: 'tool', tool_name: 'web_search', tool_ok: false, tool_result: 'timeout' }); return }
        steps.push({ kind: 'tool', tool_name: 'web_search', tool_ok: r.ok, tool_result: r.ok ? r.summary.slice(0, 500) : (r.error ?? 'failed') })
        if (r.ok) evidence = `== SEARCH (${searchQuery}) ==\n${r.summary.slice(0, 1500)}`
      }),
    )
  }

  await Promise.all(parallel)

  // Build single LLM call
  const userContent = evidence
    ? `${question}\n\n[BUKTI DARI INTERNET / SUMBER]:\n${evidence}`
    : question

  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(intent, summary) },
    ...history.slice(-8).map(h => ({ role: h.role === 'user' ? 'user' as const : 'assistant' as const, content: h.content })),
    { role: 'user', content: userContent },
  ]

  const remaining = Math.max(5_000, AGENT_BUDGET_MS - (Date.now() - t0))
  const r = await chatOnce(messages, undefined, remaining)
  if (r && r.text) {
    steps.push({ kind: 'final', provider: r.provider, model: r.model, ms: r.ms, text: r.text })
    return { answer: r.text, provider: r.provider, available: true, steps, total_ms: Date.now() - t0, iterations: 1 }
  }

  // Fallback: structured answer from raw evidence (no LLM)
  const fallback = formatRawEvidence(evidence, intent, searchQuery, summary)
  steps.push({ kind: 'fallback', text: fallback })
  return { answer: fallback, provider: 'titan-orchestrator', available: false, steps, total_ms: Date.now() - t0, iterations: 1 }
}

// Format raw evidence into Bahasa Indonesia answer when LLM is unavailable.
function formatRawEvidence(evidence: string, intent: string, query: string, summary: string): string {
  if (intent === 'internal' && summary) {
    return `Saya belum bisa jawab spesifik, tapi ini snapshot bisnis:\n\n${summary}\n\nTanya lagi dengan lebih spesifik?`
  }
  if (!evidence.trim()) {
    return `Saya tidak menemukan data terbaru untuk "${query}". Bisa spesifikkan lebih lanjut?`
  }
  // Strip raw citations + clean up
  const cleaned = evidence
    .replace(/^==\s*[A-Z_]+\s*==\s*$/gm, '')
    .replace(/^##\s*[^\n]+\n/gm, '')
    .replace(/^\s*[-*]\s*\[(Wiki|HN|Brave|JINA|Hacker News|Wikipedia|DuckDuckGo)\]\s+/gim, '• ')
    .replace(/https?:\/\/[^\s)\]\]]+/g, '')
    .replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return `Saya belum bisa synthesize dengan tools AI, tapi berikut rangkuman dari internet untuk "${query}":\n\n${cleaned.slice(0, 1200)}${cleaned.length > 1200 ? '…' : ''}`
}
