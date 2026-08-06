// lib/ai/agent.ts
// TITAN — Syahfalah AI Copilot agent.
// Architecture: intent-driven orchestrator.
//
// Flow:
//   1. Detect intent (internal / external / news / music / analysis /
//      analysis-with-data / social / url).
//   2. Load internal business context if relevant.
//   3. Run tools per intent (deterministic, not LLM-decided).
//   4. Pass collected evidence to LLM with focused prompt to synthesize
//      a clean Bahasa Indonesia answer.
//   5. If LLM synthesis fails, fall back to formatted raw evidence.

import { ChatMessage, chatOnce, LLMResponse } from './providers'
import { getToolDefinitions, runTool, web_search, youtube_trending, billboard_hot_100 } from './tools'
import { loadBusinessContext, deterministicSlice, BusinessContext } from './context'

const AGENT_BUDGET_MS = 24_000
const MAX_LLM_STEPS = 4

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentStep {
  kind: 'intent' | 'context' | 'tool' | 'llm' | 'final' | 'fallback' | 'synth'
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
  context: BusinessContext
}

function narrativeContext(ctx: BusinessContext): string {
  const m = ctx.company.metrics
  const c = ctx.company.cashflow
  const p = ctx.company.people
  const parts: string[] = []
  parts.push(`PT Syahfalah, snapshot ${ctx.company.as_of_ymd}.`)
  parts.push(`Leads pipeline: ${m.leads_total} (estimasi total nilai Rp ${fmtRp(m.leads_total_value_rupiah)}). Distribusi stage: ${Object.entries(m.leads_by_stage).map(([k, v]) => `${k}=${v}`).join(', ') || 'kosong'}.`)
  parts.push(`KPI: ${m.kpis_on_track} on-track, ${m.kpis_off_track} off-track dari total ${m.kpis_total}.`)
  parts.push(`Operasional: ${m.overdue_tasks} task overdue, ${m.overdue_consumer_cases} consumer case overdue, ${m.open_maintenance_tickets} maintenance ticket open, ${m.pending_approvals} pending approval, ${m.overdue_purchase_requests} purchase request pending.`)
  parts.push(`Cashflow: booking pipeline Rp ${fmtRp(c.booking_pipeline_rupiah)}, SP3K submitted=${c.sp3k_submitted} approved=${c.sp3k_approved}, Akad done=${c.akad_done}, maintenance pipeline Rp ${fmtRp(c.maintenance_revenue_potential_rupiah)}.`)
  parts.push(`People: ${p.total_active_users} aktif. Hari ini: ${p.today_attendance.checked_in} sudah check-in, ${p.today_attendance.checked_out} sudah check-out, ${p.today_attendance.absent} alpha.`)
  if (p.by_role && Object.keys(p.by_role).length > 0) {
    parts.push(`Distribusi role: ${Object.entries(p.by_role).map(([k, v]) => `${k}=${v}`).join(', ')}.`)
  }
  if (ctx.company.clusters.length > 0) {
    parts.push(`Clusters (${ctx.company.clusters.length}): ${ctx.company.clusters.slice(0, 8).map(c => `${c.code} ${c.name} (${c.units_sold}/${c.total_units} unit, avg Rp ${fmtRp(c.avg_price_rupiah)})`).join('; ')}.`)
  }
  if (ctx.company.projects.length > 0) {
    parts.push(`Projects (${ctx.company.projects.length}): ${ctx.company.projects.slice(0, 8).map(p => `${p.code} ${p.name} (${p.status}, ${p.progress_pct}% done, spent Rp ${fmtRp(p.spent_rupiah)} of Rp ${fmtRp(p.budget_rupiah)})`).join('; ')}.`)
  }
  if (ctx.company.top_kpis.length > 0) {
    parts.push(`Top KPIs by progress: ${ctx.company.top_kpis.slice(0, 5).map(k => `${k.name} (${k.progress_pct}% ${k.status})`).join('; ')}.`)
  }
  if (ctx.company.recent_activity.length > 0) {
    parts.push(`Recent activity (8 latest): ${ctx.company.recent_activity.map(a => `${a.ts} ${a.kind} ${a.title}`).join('; ')}.`)
  }
  if (ctx.company.notifications_unread > 0) {
    parts.push(`Notifikasi belum dibaca: ${ctx.company.notifications_unread}.`)
  }
  return parts.join('\n')
}

function fmtRp(n: number): string {
  if (!n || !Number.isFinite(n)) return '0'
  return new Intl.NumberFormat('id-ID').format(Math.round(n))
}

// Intent detection — deterministic, not LLM-decided.
export type QuestionIntent =
  | 'internal'      // ask about Syahfalah data
  | 'music'         // trending songs / charts
  | 'news'          // current events / politics / economy
  | 'business'      // companies / markets / real estate / industry
  | 'tech'          // AI / programming / dev tools
  | 'social'        // TikTok / IG / FB / YouTube content
  | 'url'           // specific URL to fetch
  | 'general'       // fallback: anything else

function detectIntent(q: string): QuestionIntent {
  const low = q.toLowerCase()
  if (/https?:\/\//.test(q)) return 'url'
  if (/\b(syahfalah|leads?|kpi|cluster|project|booking|sp3k|akad|maintenance|cashflow|approval|task|consumer|cabang|properti kita|perusahaan kita|kantor)\b/.test(low)) return 'internal'
  if (/\b(lagu|musik|band|artis|song|music|charts|billboard|trending music|populer|terpopuler|spotify|album|remix|cover)\b/.test(low)) return 'music'
  if (/\b(berita|news|artikel|terbaru|hari ini|minggu ini|bulan ini|rilis)\b.*(ekonomi|politik|teknologi|properti|housing|konstruksi|developer|inflasi|suku bunga|bi rate|rupiah|ihsg|ihkg|keuangan|perbankan)|^\s*(apa|siapa|kapan|dimana|bagaimana).*?(terjadi|berita|hari ini|minggu ini)\b/.test(low)) return 'news'
  if (/\b(developer|perusahaan|properti|real estate|kontraktor|arsitek|listing|proyek Konstruksi|jalan tol)\b/.test(low)) return 'business'
  if (/\b(ai|llm|gpt|claude|gemini|programming|kode|github|stack overflow|developer|programmer|software|teknologi|startup)\b/.test(low)) return 'tech'
  if (/\b(tiktok|instagram|ig|reels|tweet|twitter|x\.com|sosial media|influencer|trending yt|trending youtube)\b/.test(low)) return 'social'
  if (/\b(berita|news|artikel|hari ini|minggu ini|bulan ini|terbaru|ekonomi|politik|properti|inflasi|bi rate|suku bunga|pertumbuhan|inflasi)\b/.test(low)) return 'news'
  return 'general'
}

// STOP words for query extraction (Indonesian + English)
const STOP_WORDS = new Set([
  'cari', 'tolong', 'beri', 'kasih', 'info', 'tentang', 'dong', 'ya', 'sih', 'deh',
  'platform', 'khususnya', 'terbaik', 'di', 'yang', 'dan', 'atau', 'ke', 'dari',
  'untuk', 'adalah', 'apa', 'siapa', 'kapan', 'dimana', 'bagaimana', 'gmana',
  'gimana', 'how', 'why', 'what', 'who', 'where', 'when', 'the', 'a', 'an',
  'in', 'on', 'at', 'to', 'for', 'of', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'top', '10', 'best', 'sebutkan', 'sebut', 'berikan', 'tampilkan',
  'list', 'daftar', 'list', 'show', 'terbaik', 'handphone', 'hp', 'laptop',
  'tahun', '2025', '2026', '2024', '2027', 'sekarang', 'saat', 'ini',
])

function extractQuery(q: string): string {
  const low = q.toLowerCase()
  const tokens = low.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t && !STOP_WORDS.has(t) && t.length > 1)
  return tokens.slice(0, 8).join(' ').trim() || low.slice(0, 80)
}

function buildSystemPrompt(intent: QuestionIntent, narrative: string, withTools: boolean): string {
  const persona = `Kamu adalah TITAN, AI Copilot PT Syahfalah (developer properti Indonesia). Kamu bicara dengan owner atau kepala kantor. Personality: hangat, analitis, tajam, banyak referensi — seperti konsultan senior yang hapal data. JANGAN terdengar template.

CARA BICARA:
- Bahasa Indonesia natural, boleh pakai istilah teknis Inggris (cluster, pipeline, off-track, dst).
- PANJANG: sesuaikan. Yes/no → 1 kalimat. Analitis → 3-6 bullet. Breakdown → max 8 bullet.
- JANGAN pakai pembuka template ("Berikut adalah...", "Berdasarkan data..."). Langsung to the point.
- JANGAN mengarang angka. Kalau tidak yakin, bilang "Saya tidak yakin" dan jelaskan.
- BOLEH kasih opini operasional. JANGAN kasih saran hukum/medis/finansial personal.
- Selalu jawab dalam Bahasa Indonesia.

SNAPSHOT BISNIS:
${narrative}`

  if (!withTools) return persona

  const toolNote = `

KAMU PUNYA AKSES KE TOOLS (pakai kalau perlu):
- web_search: internet search (multiple sources)
- youtube_trending: top 10 trending YouTube
- billboard_hot_100: top 20 Billboard Hot 100
- fetch_url: buka web page
- fetch_oembed: metadata YouTube/TikTok/IG
- fetch_company_profile: reload internal context

Pakai tool HANYA kalau user butuh data live (yang kamu tidak punya di training). Kalau pertanyaan cukup dijawab dari pengetahuan atau dari snapshot bisnis, langsung jawab tanpa tool.`
  return persona + toolNote
}

export async function runAgent(
  question: string,
  history: ConversationTurn[] = [],
): Promise<AgentResult> {
  const t0 = Date.now()
  const steps: AgentStep[] = []
  let iterations = 0

  // 1. Detect intent (deterministic)
  const intent = detectIntent(question)
  steps.push({ kind: 'intent', intent })

  // 2. Load internal context (always parallel with intent detection)
  const context = await loadBusinessContext()
  const narrative = narrativeContext(context)

  // 3. Decide tools to call based on intent
  const searchQuery = extractQuery(question)
  const tToolStart = Date.now()

  // Always try web_search first for any external query
  const toolCalls: Array<Promise<{ name: string; ok: boolean; summary: string; error?: string }>> = []

  if (intent === 'url') {
    const urlMatch = question.match(/https?:\/\/[^\s]+/)?.[0]
    if (urlMatch) {
      toolCalls.push(runTool('fetch_url', JSON.stringify({ url: urlMatch, max_chars: 4000 })).then(r => ({ name: 'fetch_url', ...r })))
    }
  } else if (intent === 'music') {
    toolCalls.push(
      web_search({ query: searchQuery, max_results: 5 }).then(r => ({ name: 'web_search', ...r })),
      youtube_trending({ region: 'ID' }).then(r => ({ name: 'youtube_trending', ...r })),
      billboard_hot_100().then(r => ({ name: 'billboard_hot_100', ...r })),
    )
  } else if (intent === 'news' || intent === 'business' || intent === 'tech' || intent === 'general') {
    toolCalls.push(
      web_search({ query: searchQuery, max_results: 5 }).then(r => ({ name: 'web_search', ...r })),
    )
  } else if (intent === 'social') {
    toolCalls.push(
      web_search({ query: searchQuery, max_results: 5 }).then(r => ({ name: 'web_search', ...r })),
    )
  }

  // 4. Run all tools in parallel — fastest path
  const toolResults = await Promise.all(toolCalls)
  for (const tr of toolResults) {
    steps.push({
      kind: 'tool',
      tool_name: tr.name,
      tool_args: '',
      tool_result: tr.ok ? tr.summary.slice(0, 500) : (tr.error ?? 'failed'),
      tool_ok: tr.ok,
    })
  }

  // 5. Internal-only: ask LLM directly with internal narrative (no synthesis needed)
  if (intent === 'internal') {
    const messages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt('internal', narrative, false) },
      ...history.slice(-10).map(h => ({ role: h.role === 'user' ? 'user' as const : 'assistant' as const, content: h.content })),
      { role: 'user', content: question },
    ]
    iterations = 1
    const r = await chatOnce(messages, undefined, Math.max(5_000, AGENT_BUDGET_MS - (Date.now() - t0)))
    if (r && r.text) {
      steps.push({ kind: 'final', provider: r.provider, model: r.model, ms: r.ms, text: r.text })
      return { answer: r.text, provider: r.provider, available: true, steps, total_ms: Date.now() - t0, iterations, context }
    }
  }

  // 6. Synthesis: pass collected evidence to LLM with focused prompt
  const evidence = toolResults
    .filter(tr => tr.ok && tr.summary)
    .map(tr => `== ${tr.name.toUpperCase()} ==\n${tr.summary.slice(0, 1200)}`)
    .join('\n\n')

  if (!evidence.trim()) {
    // No tool data — try plain LLM (no tools)
    const messages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt(intent, narrative, false) },
      ...history.slice(-10).map(h => ({ role: h.role === 'user' ? 'user' as const : 'assistant' as const, content: h.content })),
      { role: 'user', content: question },
    ]
    iterations = 1
    const r = await chatOnce(messages, undefined, Math.max(5_000, AGENT_BUDGET_MS - (Date.now() - t0)))
    if (r && r.text) {
      steps.push({ kind: 'final', provider: r.provider, model: r.model, ms: r.ms, text: r.text })
      return { answer: r.text, provider: r.provider, available: true, steps, total_ms: Date.now() - t0, iterations, context }
    }
    // deterministic fallback
    const fb = deterministicSlice(question, context)
    steps.push({ kind: 'fallback', text: fb })
    return { answer: fb + '\n\n(Catatan: TITAN tidak menemukan data dari internet dan internal untuk pertanyaan ini. Coba spesifikkan pertanyaan, atau paste URL sumber yang Anda maksud.)', provider: 'deterministic', available: !!r, steps, total_ms: Date.now() - t0, iterations, context }
  }

  // 7. Synthesize via LLM with collected evidence
  const synthMessages: ChatMessage[] = [
    {
      role: 'system',
      content: `Kamu TITAN, AI Copilot PT Syahfalah. Personality: tajam, analitis, banyak referensi, Bahasa Indonesia natural, bukan template-formatter.

ATURAN SINTESIS:
- Jawab SERTA dengan data dari "BUKTI" di bawah.
- JANGAN sertakan URL apapun di jawaban (kecuali konteks benar-benar butuh link).
- JANGAN pakai format "[Wiki] ..." atau "[Brave] ...". Konversi jadi bahasa natural.
- Kalau data tidak cukup relevan dengan pertanyaan, bilang "Saya tidak yakin" dan minta klarifikasi.
- JANGAN mengarang angka / fakta. Kalau tidak ada di bukti, bilang tidak tahu.
- Jawaban natural, seperti manusia yang hapal data. Bukan chatbot.`
    },
    {
      role: 'user',
      content: `Pertanyaan: ${question}

BUKTI dari internet (${searchQuery}):
${evidence.slice(0, 2400)}

Jawab sekarang dalam Bahasa Indonesia.`
    },
  ]
  iterations = 1
  const synth = await chatOnce(synthMessages, undefined, Math.max(5_000, AGENT_BUDGET_MS - (Date.now() - t0)))
  if (synth && synth.text) {
    steps.push({ kind: 'synth', provider: synth.provider, model: synth.model, ms: synth.ms, text: synth.text })
    return { answer: synth.text, provider: synth.provider, available: true, steps, total_ms: Date.now() - t0, iterations, context }
  }

  // 8. Last resort: formatted raw evidence
  const formatted = formatRawEvidence(evidence, intent, searchQuery)
  steps.push({ kind: 'fallback', text: formatted })
  return { answer: formatted, provider: 'titan-orchestrator', available: true, steps, total_ms: Date.now() - t0, iterations, context }
}

// Format raw tool evidence into a clean, human-readable answer.
// Strips raw citations, decodes HTML entities, structures by section.
function formatRawEvidence(evidence: string, intent: QuestionIntent, query: string): string {
  if (!evidence.trim()) return `Saya tidak menemukan data spesifik untuk "${query}". Bisa spesifikkan lebih lanjut?`

  // Strip raw "[Wiki] ..." prefixes
  const cleaned = evidence
    .replace(/^==\s*[A-Z_]+\s*==\s*$/gm, '')
    .replace(/^##\s*[^\n]+\n/gm, '')
    .replace(/^\s*[-*]\s*\[(Wiki|HN|Brave|JINA|Hacker News|Wikipedia|DuckDuckGo)\]\s+/gim, '• ')
    .replace(/https?:\/\/[^\s)\]]+/g, '')  // strip URLs
    .replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

  // Build short intro
  const intro = `Berikut rangkuman dari ${intent} untuk "${query}":`

  // Take first 800 chars of meaningful content
  const body = cleaned.slice(0, 1200).trim()

  return `${intro}\n\n${body}${body.length < cleaned.length ? '…' : ''}`
}
