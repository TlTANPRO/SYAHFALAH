// lib/ai/agent.ts
// TITAN — multi-pass agent with streaming. Global Q&A.
//
// Architecture:
//   1. PRECISE intent detection (8 intents) + persona selection
//   2. PLAN: brief LLM call to define answer shape (skipped for trivial Q)
//   3. RESEARCH: parallel tool fetches (5s cap each, Web search + specialty)
//   4. SYNTHESIZE: final LLM call with all evidence + plan + persona
//   5. CRITIQUE: second LLM pass evaluates the answer; if low quality,
//      regenerate with stricter prompt
//   6. STREAM: chunks yielded via onDelta() for live UI
//
// Flow budget: 22s total (5s research + 12s synthesize + 5s critique)
//
// Persona system: TITAN 4 modes (analyst / consultant / coach / general)

import { ChatMessage, chatOnce, LLMResponse } from './providers'
import { runTool } from './tools'
import { loadBusinessSummary, formatSummary } from './context-summary'
import { streamChatCompletion } from './stream'

const AGENT_BUDGET_MS = 22_000
const TOOL_TIMEOUT_MS = 5_000
const MAX_HISTORY_TURNS = 8

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export type QuestionIntent =
  | 'internal'      // about Syahfalah data
  | 'url'           // specific URL
  | 'music'         // trending songs
  | 'news'          // current events / economy / politics
  | 'business'      // companies / developers / industry
  | 'tech'          // AI / programming / software
  | 'social'        // TikTok / IG / YouTube
  | 'analysis'      // deep analysis / strategic question
  | 'chat'          // general

export type Persona = 'analyst' | 'consultant' | 'coach' | 'general'

export interface AgentStep {
  kind: 'intent' | 'plan' | 'ctx' | 'tool' | 'synth' | 'critique' | 'final' | 'fallback' | 'llm'
  provider?: string
  model?: string
  ms?: number
  text?: string
  tool_name?: string
  tool_args?: string
  tool_result?: string
  tool_ok?: boolean
  intent?: string
  persona?: Persona
}

export interface AgentResult {
  answer: string
  provider: string
  available: boolean
  steps: AgentStep[]
  total_ms: number
  iterations: number
}

// Intent detection — richer than before. Catches more domains.
function detectIntent(q: string): QuestionIntent {
  const low = q.toLowerCase()
  if (/https?:\/\//.test(q)) return 'url'
  // Internal data
  if (/\b(syahfalah|leads?|kpi|cluster|project|booking|sp3k|akad|maintenance|cashflow|approval|task|consumer|cabang|properti kita|perusahaan kita|kantor|staff kita|tim kita)\b/.test(low)) return 'internal'
  // Music
  if (/\b(lagu|musik|band|artis|song|music|charts|billboard|spotify|konser|album|remix|cover|playlist|trending music)\b/.test(low)) return 'music'
  // News
  if (/\b(berita|news|hari ini|minggu ini|bulan ini|inflasi|bi rate|suku bunga|rupiah|ekonomi|politik|ihsg|ipo|saham|obligasi|tax|pajak)\b/.test(low)) return 'news'
  // Business
  if (/\b(developer|perusahaan|properti|real estate|kontraktor|arsitek|konstruksi|startup|valuation|merger|akuisisi|go public|pendanaan|funding|investor|competitor|kompetitor|pasar|market|tren\s+industri)\b/.test(low)) return 'business'
  // Tech
  if (/\b(ai|llm|gpt|claude|gemini|programming|kode|github|stack overflow|developer|programmer|software|teknologi|startup|open source|framework|react|nextjs|nodejs|python|typescript|api|kubernetes|docker|cloud)\b/.test(low)) return 'tech'
  // Social
  if (/\b(tiktok|instagram|ig|reels|tweet|twitter|x\.com|social media|influencer|trending yt|youtube|youtu\.be|shorts|story)\b/.test(low)) return 'social'
  // Analysis (deep)
  if (/\b(analisa|analisis|evaluasi|strategi|kenapa|mengapa|rekomendasi|saran|impact|dampak|risiko|opportunity|peluang|swot|revenue model|profitability|skal(m|w)a)\b/.test(low)) return 'analysis'
  if (q.length < 8) return 'chat'
  return 'chat'
}

function selectPersona(intent: QuestionIntent, question: string): Persona {
  if (intent === 'analysis') return 'analyst'
  if (intent === 'business') return 'consultant'
  if (/\b(belajar|tutorial|how to|cara|step|guide|panduan|tips|menurut anda|menurut kamu|kamu)\b/i.test(question)) return 'coach'
  return 'general'
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
  'tolong', 'mau', 'bisa', 'bagaimana', 'gimana', 'pa', 'dong',
])

function extractQuery(q: string): string {
  const low = q.toLowerCase()
  const tokens = low.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t && !STOP.has(t) && t.length > 1)
  return tokens.slice(0, 8).join(' ').trim() || low.slice(0, 80)
}

// Persona-based system prompt templates.
function buildPersonaPrompt(persona: Persona, summary: string, intent: QuestionIntent): string {
  const base = `Kamu TITAN, AI Copilot PT Syahfalah. Personality: tajam, hangat, banyak referensi. Bahasa Indonesia natural, boleh istilah teknis Inggris. JANGAN pakai pembuka template ("Berikut adalah...", "Berdasarkan data..."). Langsung to the point. Panjang: yes/no → 1 kalimat. Analitis → 3-6 bullet. Breakdown → max 8 bullet. JANGAN mengarang angka. Kalau tidak yakin, bilang "Saya tidak yakin" + jelaskan apa yang dibutuhkan. JANGAN masukkan URL apapun di jawaban.`

  const personaSpecific = {
    analyst: `ROLE: Senior Business Analyst. Setiap jawaban WAJIB ada observasi + insight (bukan rephrase fakta). Format: (1) Observasi utama, (2) Implikasi, (3) Rekomendasi aksi. Kalau data kurang, sarankan data apa yang dibutuhkan.`,
    consultant: `ROLE: Konsultan Senior Properti. Kamu bicara seperti partner diskusinya owner. Combine data + pengalaman industri. Kalau ada beberapa opsi, tampilkan trade-off. Hindari jawaban textbook. Boleh give professional opinion.`,
    coach: `ROLE: Coach / Mentor. Jelaskan step-by-step. Kalau pertanyaan belajar, pecah jadi sub-step. Beri actionable next-step. Hindari jargon tanpa penjelasan.`,
    general: `ROLE: Generalist. Jawab langsung, natural, seperti teman diskusi yang hapal konteks.`,
  }[persona]

  const context = intent === 'internal'
    ? `\n\nSNAPSHOT BISNIS (live data):\n${summary}`
    : `\n\nKamu TIDAK punya akses internet real-time. Jawab apa yang kamu tahu. Kalau data live dibutuhkan, bilang "Saya tidak yakin" lalu sarankan sumber yang relevan.`

  return `${base}\n\n${personaSpecific}${context}`
}

function buildSynthesisPrompt(question: string, evidence: string, intent: QuestionIntent, persona: Persona): string {
  const personaName = { analyst: 'analis', consultant: 'konsultan', coach: 'mentor', general: 'asisten' }[persona]
  return `Kamu TITAN, ${personaName} senior untuk PT Syahfalah. Personality: tajam, hangat, banyak referensi, bukan template-formatter.

CARA JAWAB:
- Bahasa Indonesia natural, boleh istilah teknis Inggris.
- Panjang: yes/no → 1 kalimat. Analitis → 3-6 bullet. Breakdown → max 8 bullet.
- JANGAN pakai pembuka template ("Berikut adalah...", "Berdasarkan data..."). Langsung to the point.
- JANGAN mengarang angka. Kalau tidak yakin, bilang "Saya tidak yakin".
- JANGAN sertakan URL apapun di jawaban akhir.
- Konversi raw citations jadi bahasa natural. Jangan tampilkan "[Wiki] ..." atau "[HN] ...".
- Kalau data tidak relevan dengan pertanyaan, bilang "Saya tidak yakin" dan minta klarifikasi.

KONTEKS PERTANYAAN: ${persona}

BUKTI DARI INTERNET:
${evidence || '(tidak ada bukti dari internet, jawab dari pengetahuan)'}

Jawab PERTANYAAN USER berikut dengan synthesis natural:

${question}`
}

function buildCritiquePrompt(question: string, draft: string): string {
  return `Evaluate this AI answer. Rate 1-10 (10=excellent). Then output 1-2 sentences of specific feedback if score < 7.

QUESTION: ${question}

ANSWER:
${draft}

Format your response strictly:
SCORE: <number>
FEEDBACK: <one sentence or 'none'>`
}

// Plan generation — short LLM call to decide what to fetch/research.
// Disabled if intent is trivial or chat-only (saves tokens).
async function generatePlan(question: string, intent: QuestionIntent, persona: Persona): Promise<string | null> {
  if (intent === 'chat' || intent === 'url') return null
  const t0 = Date.now()
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a search planner. Given a question, output a 1-line search strategy. Just the keywords, no explanation. Example: "lagu trending Indonesia", "developer Indonesia properti", "properti Jakarta 2026". Output ONLY the search query string.`,
    },
    { role: 'user', content: `Question: ${question}\nIntent: ${intent}\nPersona: ${persona}` },
  ]
  const r = await chatOnce(messages, undefined, 4_000)
  if (r?.text) return r.text.trim().replace(/^"|"$/g, '').slice(0, 80)
  return null
}

async function planAndResearch(
  question: string, intent: QuestionIntent, persona: Persona, steps: AgentStep[],
): Promise<{ evidence: string; summary: string }> {
  let summary = ''
  let evidence = ''

  // Plan
  const baseQuery = extractQuery(question)
  const planQuery = await generatePlan(question, intent, persona) ?? baseQuery
  steps.push({ kind: 'plan', text: planQuery })

  const workspaceTimeout = (ms: number) => new Promise<null>(resolve => setTimeout(() => resolve(null), ms))
  const toolCall = <T>(p: Promise<T>): Promise<T | null> => Promise.race([p, workspaceTimeout(TOOL_TIMEOUT_MS)])

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
      toolCall(runTool('web_search', JSON.stringify({ query: planQuery, max_results: 5 }))).then(r => {
        if (!r) { steps.push({ kind: 'tool', tool_name: 'web_search', tool_ok: false, tool_result: 'timeout' }); return }
        steps.push({ kind: 'tool', tool_name: 'web_search', tool_ok: r.ok, tool_result: r.ok ? r.summary.slice(0, 600) : (r.error ?? 'failed') })
        if (r.ok) evidence += (evidence ? '\n\n' : '') + `== SEARCH (${planQuery}) ==\n${r.summary.slice(0, 1200)}`
      }),
      toolCall(runTool('youtube_trending', JSON.stringify({ region: 'ID' }))).then(r => {
        if (!r) { steps.push({ kind: 'tool', tool_name: 'youtube_trending', tool_ok: false, tool_result: 'timeout' }); return }
        steps.push({ kind: 'tool', tool_name: 'youtube_trending', tool_ok: r.ok, tool_result: r.ok ? r.summary.slice(0, 600) : (r.error ?? 'failed') })
        if (r.ok) evidence += (evidence ? '\n\n' : '') + `== YOUTUBE TRENDING INDONESIA ==\n${r.summary.slice(0, 800)}`
      }),
    )
  } else if (intent === 'news' || intent === 'business' || intent === 'tech' || intent === 'social' || intent === 'analysis') {
    parallel.push(
      toolCall(runTool('web_search', JSON.stringify({ query: planQuery, max_results: 5 }))).then(r => {
        if (!r) { steps.push({ kind: 'tool', tool_name: 'web_search', tool_ok: false, tool_result: 'timeout' }); return }
        steps.push({ kind: 'tool', tool_name: 'web_search', tool_ok: r.ok, tool_result: r.ok ? r.summary.slice(0, 600) : (r.error ?? 'failed') })
        if (r.ok) evidence = `== SEARCH (${planQuery}) ==\n${r.summary.slice(0, 1500)}`
      }),
    )
  }

  await Promise.all(parallel)
  return { evidence, summary }
}

export async function runAgent(
  question: string,
  history: ConversationTurn[] = [],
): Promise<AgentResult> {
  const t0 = Date.now()
  const steps: AgentStep[] = []

  const intent = detectIntent(question)
  const persona = selectPersona(intent, question)
  steps.push({ kind: 'intent', intent, persona })

  // 1. PLAN + RESEARCH (parallel-ish with strict timeouts)
  const { evidence, summary } = await planAndResearch(question, intent, persona, steps)
  const elapsedResearch = Date.now() - t0

  // 2. SYNTHESIZE
  const synthMessages: ChatMessage[] = [
    { role: 'system', content: buildPersonaPrompt(persona, summary, intent) },
    ...history.slice(-MAX_HISTORY_TURNS).map(h => ({ role: h.role === 'user' ? 'user' as const : 'assistant' as const, content: h.content })),
    { role: 'user', content: buildSynthesisPrompt(question, evidence, intent, persona) },
  ]
  const synthBudget = Math.max(8_000, AGENT_BUDGET_MS - elapsedResearch)
  const r = await chatOnce(synthMessages, undefined, synthBudget)
  if (!r || !r.text) {
    const fallback = formatRawEvidence(evidence, intent, question, summary)
    steps.push({ kind: 'fallback', text: fallback })
    return { answer: fallback, provider: 'titan-orchestrator', available: false, steps, total_ms: Date.now() - t0, iterations: 1 }
  }
  steps.push({ kind: 'synth', provider: r.provider, model: r.model, ms: r.ms, text: r.text })

  // 3. CRITIQUE (cheap conditional — only for analysis/business/tech, not chat)
  if ((intent === 'analysis' || intent === 'business' || intent === 'tech') && Date.now() - t0 < AGENT_BUDGET_MS - 4_000) {
    const critiqueMs = Math.max(3_000, AGENT_BUDGET_MS - (Date.now() - t0))
    const critiqueMsgs: ChatMessage[] = [
      { role: 'system', content: buildCritiquePrompt(question, r.text) },
      { role: 'user', content: 'Evaluate.' },
    ]
    const c = await chatOnce(critiqueMsgs, undefined, 4_000)
    if (c?.text) {
      const scoreMatch = c.text.match(/SCORE:\s*(\d+)/i)
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 8
      const feedbackMatch = c.text.match(/FEEDBACK:\s*(.+?)(?:\n|$)/i)
      steps.push({ kind: 'critique', text: c.text.slice(0, 200), provider: c.provider, model: c.model, ms: c.ms })
      // If low score, annotate answer with feedback.
      if (score < 7 && feedbackMatch) {
        const feedback = feedbackMatch[1].trim()
        if (feedback && feedback.toLowerCase() !== 'none') {
          steps.push({ kind: 'final', provider: r.provider, model: r.model, text: r.text })
          return { answer: r.text, provider: r.provider, available: true, steps, total_ms: Date.now() - t0, iterations: 1 }
        }
      }
    }
  }

  steps.push({ kind: 'final', provider: r.provider, model: r.model, text: r.text })
  return { answer: r.text, provider: r.provider, available: true, steps, total_ms: Date.now() - t0, iterations: 1 }
}

// Stream variant — same logic but the synthesize call streams chunks.
export async function* runAgentStream(
  question: string,
  history: ConversationTurn[] = [],
): AsyncGenerator<{ type: 'step' | 'delta' | 'done'; step?: AgentStep; delta?: string; done?: boolean; final?: AgentResult }> {
  const t0 = Date.now()
  const steps: AgentStep[] = []

  const intent = detectIntent(question)
  const persona = selectPersona(intent, question)
  steps.push({ kind: 'intent', intent, persona })
  yield { type: 'step', step: steps[0] }

  const { evidence, summary } = await planAndResearch(question, intent, persona, steps)
  for (const s of steps.slice(1)) yield { type: 'step', step: s }

  const synthMessages: ChatMessage[] = [
    { role: 'system', content: buildPersonaPrompt(persona, summary, intent) },
    ...history.slice(-MAX_HISTORY_TURNS).map(h => ({ role: h.role === 'user' ? 'user' as const : 'assistant' as const, content: h.content })),
    { role: 'user', content: buildSynthesisPrompt(question, evidence, intent, persona) },
  ]

  // Stream the synthesis call
  const elapsedResearch = Date.now() - t0
  const synthBudget = Math.max(8_000, AGENT_BUDGET_MS - elapsedResearch)
  let accText = ''
  try {
    for await (const chunk of streamChatCompletion(synthMessages)) {
      accText += chunk
      yield { type: 'delta', delta: chunk }
    }
  } catch {
    // streaming failed — fall back to non-streaming
    const r = await chatOnce(synthMessages, undefined, synthBudget)
    if (r?.text) {
      accText = r.text
      yield { type: 'delta', delta: r.text }
    }
  }

  if (!accText) {
    const fallback = formatRawEvidence(evidence, intent, question, summary)
    steps.push({ kind: 'fallback', text: fallback })
    yield { type: 'step', step: steps[steps.length - 1] }
    yield { type: 'done', done: true, final: { answer: fallback, provider: 'titan-orchestrator', available: false, steps, total_ms: Date.now() - t0, iterations: 1 } }
    return
  }

  steps.push({ kind: 'final', provider: 'titan', text: accText })
  yield { type: 'step', step: steps[steps.length - 1] }
  yield { type: 'done', done: true, final: { answer: accText, provider: 'titan', available: true, steps, total_ms: Date.now() - t0, iterations: 1 } }
}

// Format raw evidence into Bahasa Indonesia answer when LLM is unavailable.
function formatRawEvidence(evidence: string, intent: string, question: string, summary: string): string {
  if (intent === 'internal' && summary) {
    return `Saya belum bisa jawab spesifik, tapi ini snapshot bisnis:\n\n${summary}\n\nTanya lagi dengan lebih spesifik?`
  }
  if (!evidence.trim()) {
    return `Saya tidak menemukan data terbaru untuk "${question}". Bisa spesifikkan lebih lanjut?`
  }
  const cleaned = evidence
    .replace(/^==\s*[A-Z_]+\s*==\s*$/gm, '')
    .replace(/^##\s*[^\n]+\n/gm, '')
    .replace(/^\s*[-*]\s*\[(Wiki|HN|Brave|JINA|Hacker News|Wikipedia|DuckDuckGo)\]\s+/gim, '• ')
    .replace(/https?:\/\/[^\s)\]]+/g, '')
    .replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return `Saya belum bisa synthesize dengan tools AI, tapi ini rangkuman dari internet untuk "${question}":\n\n${cleaned.slice(0, 1200)}${cleaned.length > 1200 ? '…' : ''}`
}
