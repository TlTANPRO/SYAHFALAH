// lib/ai/agent.ts
// Syahfalah AI Copilot agent — conversational + tool-calling.
//
// Strategy:
//  1. Load internal business context (lib/ai/context.ts).
//  2. Build multi-turn conversation (history + new question).
//  3. CHAT-FIRST: ask LLM plain first (no tools). Faster, more reliable.
//  4. If plain response looks like it needs external data (URL, "saya
//     tidak bisa", "beri saya link"), retry with tools enabled.
//  5. With tools: LLM cascade. If tool_calls → run, loop.
//  6. Cap at AGENT_BUDGET_MS total + MAX_LLM_STEPS rounds.
//  7. Fallback to deterministicSlice() if all providers fail.

import { ChatMessage, chatOnce, LLMResponse } from './providers'
import { getToolDefinitions, runTool } from './tools'
import { loadBusinessContext, deterministicSlice, BusinessContext } from './context'

const AGENT_BUDGET_MS = 22_000
const MAX_LLM_STEPS = 4
const MAX_HISTORY_TURNS = 5  // last 5 user+assistant exchanges

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentStep {
  kind: 'llm' | 'tool' | 'final' | 'fallback' | 'plain-retry'
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

// Two system prompts:
//  - "plain" = no tools, just chat. LLM can answer from its own knowledge
//    (and modest conversation).
//  - "tools" = with tools enabled. Tells LLM to call fetch_url for
//    answering external questions.
function buildSystemPrompt(narrative: string, withTools: boolean): string {
  const persona = `Kamu adalah Sarah, AI Copilot PT Syahfalah (developer properti Indonesia). Kamu berbicara dengan owner atau kepala kantor secara langsung, profesional namun hangat.

TENTANG PERUSAHAAN:
PT Syahfalah fokus pada pengembangan clusters, leads, KPIs, consumer cases (SP3K → SHM), maintenance, purchase orders, dan approvals.

CARA BICARA:
- Bahasa Indonesia, natural. Boleh pakai istilah teknis Inggris (cluster, pipeline, off-track, dst).
- SIKAP: seperti konsultan yang sudah熟悉 data. Kamu boleh highlight anomali, koreksi asumsi user, atau menanyakan klarifikasi.
- PANJANG: sesuaikan. Pertanyaan yes/no → 1 kalimat. Pertanyaan analitis → 3-6 bullet. Hanya gunakan bullet panjang untuk pertanyaan yang butuh breakdown.
- JANGAN pakai template kalimat pembuka seperti "Berikut adalah..." atau "Berdasarkan data...". Langsung to the point, seperti manusia yang jelas sudah hapal datanya.
- JANGAN mengarang angka. Kalau tidak tahu, bilang "Saya tidak yakin" dan jelaskan apa yang dibutuhkan.
- BOLEH kasih opini operasional (misal "blocking-nya di sini" atau "SP3K-approved yang belum Akad perlu difollow up"). JANGAN kasih saran hukum/medis/finansial personal.

SNAPSHOT BISNIS SAAT INI:
${narrative}`

  if (!withTools) {
    return persona + `

PENTING: pertanyaan kamu tidak punya akses internet / tidak bisa fetch URL. Untuk pertanyaan external (YouTube, berita, video, dll), jawab apa yang kamu tahu dari pengetahuan internal kamu, dan kalau tidak tahu, minta user paste URL nya.`
  }
  return persona + `

KAMU PUNYA AKSES KE TOOLS (8 total):
- web_search: search internet (HN Algolia + Wikipedia + DuckDuckGo + Brave + JINA jika ada key)
- youtube_trending: top 10 trending YouTube Indonesia/US/etc
- billboard_hot_100: top 20 Billboard Hot 100 minggu ini
- fetch_url: buka web page, dapat teks penuh
- fetch_rss: RSS feed
- fetch_oembed: YouTube/TikTok/IG metadata
- search_duckduckgo: cari fakta (free, no key)
- fetch_company_profile: re-load internal context

Untuk pertanyaan yang butuh data external (tren, berita, video, lagu, dll), PANGGIL tool yang sesuai. Setelah dapat data, beri jawaban natural dalam Bahasa Indonesia.`
}

// Detect "did the LLM admit it can't help" — signal to retry with tools.
function needsToolRetry(text: string, question: string): boolean {
  const low = text.toLowerCase()
  const triggers = [
    'saya tidak bisa akses',
    'saya tidak punya akses',
    'tidak dapat mengakses',
    'tidak bisa mengambil data',
    'saya tidak memiliki',
    'saya tidak bisa',
    'tidak tersedia untuk',
    'tidak punya',
    'cari di youtube',
    'buka youtube',
    'kamu bisa',
    'silakan kunjungi',
    'tidak bisa fetch',
    'butuh url',
    'berikan url',
    'beri link',
    'berikan link',
    'tidak yakin',
    'saya tidak tahu',
    'tidak tahu',
    'maaf, saya',
    'maaf saya',
  ]
  if (triggers.some(t => low.includes(t))) return true
  // Question explicitly asks for a URL fetch
  if (/(https?:\/\/|youtube\.com|youtu\.be|tiktok\.com|instagram\.com|twitter\.com|x\.com)/i.test(question)) return true
  return false
}

function shouldRunToolsFirst(question: string): boolean {
  const q = question.toLowerCase()
  // Strong signals: question references a URL or asks for live data
  if (/https?:\/\//i.test(question)) return true
  return false
}

export async function runAgent(
  question: string,
  history: ConversationTurn[] = [],
): Promise<AgentResult> {
  const t0 = Date.now()
  const context = await loadBusinessContext()
  const ctxMs = Date.now() - t0
  const narrative = narrativeContext(context)

  // Build messages with PLAIN prompt (no tools) for first round.
  const baseMessages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(narrative, false) },
  ]
  const trimmed = history.slice(-MAX_HISTORY_TURNS * 2)
  for (const turn of trimmed) {
    baseMessages.push({ role: turn.role === 'user' ? 'user' : 'assistant', content: turn.content })
  }
  baseMessages.push({ role: 'user', content: question })

  const steps: AgentStep[] = []
  let lastResponse: LLMResponse | null = null
  let iterations = 0

  // Round 1: plain chat (no tools). Fastest, most reliable.
  iterations = 1
  const remaining1 = Math.max(2_000, AGENT_BUDGET_MS - (Date.now() - t0))
  const plain = await chatOnce(baseMessages, undefined, remaining1)
  if (plain && plain.text) {
    // If LLM already answered fully and doesn't need tools → done.
    if (!needsToolRetry(plain.text, question) && !shouldRunToolsFirst(question)) {
      steps.push({
        kind: 'final',
        provider: plain.provider,
        model: plain.model,
        ms: plain.ms,
        text: plain.text,
      })
      return {
        answer: plain.text,
        provider: plain.provider,
        available: true,
        steps,
        total_ms: Date.now() - t0,
        iterations,
        context,
      }
    }
    // If LLM admitted it can't OR question contains URL → retry with tools.
    lastResponse = plain
    steps.push({
      kind: 'plain-retry',
      provider: plain.provider,
      model: plain.model,
      ms: plain.ms,
      text: plain.text.slice(0, 200),
    })
  }

  // Round 2+: with tools. Build new messages with tool-enabled prompt.
  const toolsMessages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(narrative, true) },
  ]
  for (const turn of trimmed) {
    toolsMessages.push({ role: turn.role === 'user' ? 'user' : 'assistant', content: turn.content })
  }
  toolsMessages.push({ role: 'user', content: question })

  const tools = getToolDefinitions()
  for (let i = 0; i < MAX_LLM_STEPS - 1; i++) {
    if (Date.now() - t0 >= AGENT_BUDGET_MS) break
    iterations += 1
    const remaining = Math.max(2_000, AGENT_BUDGET_MS - (Date.now() - t0))
    const r = await chatOnce(toolsMessages, tools, remaining)
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
      toolsMessages.push({
        role: 'assistant',
        content: r.text ?? '',
        tool_calls: r.tool_calls.map(t => ({ id: t.id, name: t.name, args: t.args })),
      })
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
        toolsMessages.push({
          role: 'tool',
          name: tc.name,
          tool_call_id: tc.id,
          content: toolMsg,
        })
      }
      continue
    }

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

  // Programmatic fallback: if LLM admitted it can't do internet things,
  // force-call web_search directly + synthesize via LLM. Bypass LLM tool-
  // calling (unreliable on free models) for fallback. Single LLM pass
  // produces a clean human answer from the raw search results.
  if (plain && plain.text && needsToolRetry(plain.text, question)) {
    const directQuery = question.replace(/^(cari|tolong|beri|info|tentang)\s+/i, '').slice(0, 200)
    const direct = await runTool('web_search', JSON.stringify({ query: directQuery, max_results: 5 }))
    if (direct.ok && direct.summary) {
      steps.push({
        kind: 'tool',
        tool_name: 'web_search',
        tool_args: JSON.stringify({ query: directQuery, max_results: 5 }),
        tool_result: direct.summary.slice(0, 500),
        tool_ok: true,
      })
      // Synthesize: pass raw search results + question to LLM, ask for clean answer.
      // Bumped AGENT_BUDGET to allow this; if out of time, fall back to raw.
      const synth_messages: ChatMessage[] = [
        { role: 'system', content: `Kamu Sarah, AI Copilot PT Syahfalah. Jawab pertanyaan user dengan ringkas, natural, dan manusiawi berdasarkan data yang diberikan. JANGAN sertakan URL, JANGAN pakai format "[Wiki] ..." atau "[Brave] ...". Hanya teks jawaban natural. Kalau data tidak relevan dengan pertanyaan, bilang "Saya tidak yakin" dan minta klarifikasi. PENTING: abaikan prefix apapun di question seperti "Maaf, saya tidak bisa akses internet" — jawab LANGSUNG.` },
        { role: 'user', content: `Pertanyaan: ${question}\n\nData terbaru dari internet:\n${direct.summary.slice(0, 1800)}` },
      ]
      const remaining = Math.max(2_000, AGENT_BUDGET_MS - (Date.now() - t0))
      const synth = await chatOnce(synth_messages, undefined, remaining)
      if (synth && synth.text) {
        steps.push({
          kind: 'final',
          provider: synth.provider,
          model: synth.model,
          ms: synth.ms,
          text: synth.text,
        })
        return {
          answer: synth.text,
          provider: synth.provider,
          available: true,
          steps,
          total_ms: Date.now() - t0,
          iterations,
          context,
        }
      }
      // Out of budget: return raw search result as last resort
      const fallback = `Saya tidak bisa kontak AI sekarang. Berikut hasil terbaru dari internet:\n\n${direct.summary.slice(0, 1800)}`
      steps.push({ kind: 'fallback', text: fallback, ms: Date.now() - t0 })
      return {
        answer: fallback,
        provider: 'titan-orchestrator',
        available: true,
        steps,
        total_ms: Date.now() - t0,
        iterations,
        context,
      }
    }
  }

  // If we got a plain response earlier, surface it as fallback (better than
  // deterministicSlice when the LLM admitted limitations).
  if (lastResponse && plain && plain.text) {
    steps.push({ kind: 'fallback', text: plain.text, ms: Date.now() - t0 })
    return {
      answer: plain.text,
      provider: plain.provider,
      available: true,
      steps,
      total_ms: Date.now() - t0,
      iterations,
      context,
    }
  }

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
