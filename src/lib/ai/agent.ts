// lib/ai/agent.ts
// Syahfalah AI Copilot agent — conversational + tool-calling.
// Strategy:
//  1. Load internal business context (lib/ai/context.ts).
//  2. Build multi-turn conversation (history + new question).
//  3. Heuristic: enable tools only when question needs external data.
//  4. Send to LLM cascade. If tool_calls → run, loop.
//  5. Cap at AGENT_BUDGET_MS total + MAX_LLM_STEPS rounds.
//  6. Stream deltas via onDelta() callback (optional) for live UI feel.
//  7. Fallback to deterministicSlice() if all providers fail.

import { ChatMessage, chatOnce, LLMResponse } from './providers'
import { getToolDefinitions, runTool } from './tools'
import { loadBusinessContext, deterministicSlice, BusinessContext } from './context'

const AGENT_BUDGET_MS = 18_000
const MAX_LLM_STEPS = 4
const MAX_HISTORY_TURNS = 5  // last 5 user+assistant exchanges

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

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

// Narrative context: convert JSON slices into a readable Bahasa Indonesia
// narrative. The LLM is then grounded on fact, not raw JSON.
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

// New system prompt: gives the AI a persona, narrative context, and
// tool guidelines. Less restrictive, more natural.
function buildSystemPrompt(narrative: string): string {
  return `Kamu adalah Sarah, AI Copilot PT Syahfalah (developer properti Indonesia). Kamu berbicara dengan owner atau kepala kantor secara langsung, profesional namun hangat.

TENTANG PERUSAHAAN:
PT Syahfalah fokus pada pengembangan clusters, leads, KPIs, consumer cases (SP3K → SHM), maintenance, purchase orders, dan approvals.

CARA BICARA:
- Bahasa Indonesia, natural. Boleh pakai istilah teknis Inggris (cluster, pipeline, off-track, dst).
- SIKAP: seperti konsultan yang sudah熟悉 data. Kamu boleh highlight anomali, koreksi asumsi user, atau menanyakan klarifikasi.
- PANJANG: sesuaikan. Pertanyaan yes/no → 1 kalimat. Pertanyaan analitis → 3-6 bullet. Hanya gunakan bullet panjang untuk pertanyaan yang butuh breakdown.
- JANGAN pakai template kalimat pembuka seperti "Berikut adalah..." atau "Berdasarkan data...". Langsung to the point, seperti manusia yang jelas sudah hapal datanya.
- JANGAN mengarang angka. Kalau tidak tahu, bilang "Data tidak tersedia" dan kalau perlu jelaskan apa yang dibutuhkan (misal "kasih saya range tanggal").
- BOLEH kasih opini operasional (misal "blocking-nya di sini" atau "SP3K-approved yang belum Akad perlu difollow up"). JANGAN kasih saran hukum/medis/finansial personal.
- Untuk pertanyaan yang butuh data external (berita, tren, riset, social media), PANGGIL tool yang sesuai. Untuk pertanyaan internal saja, langsung jawab.

SNAPSHOT BISNIS SAAT INI:
${narrative}

INGAT: kamu BUKAN template-formatter. Kamu analis yang sudah hapal konteks. Kalau user tanya "gimana", jawab dengan observasi, bukan list formal.`
}

function shouldUseTools(question: string): boolean {
  const q = question.toLowerCase()
  const external = /(tren|berita|news|artikel|riset|outlook|global|2025|2026|2027|suku bunga|bi rate|inflasi|ekonomi|properti jakarta|developer lain|competitor|video|youtube|tiktok|instagram|ig|twitter|x\.com|github|repo)/i
  if (external.test(q)) return true
  if (/https?:\/\//i.test(question)) return true
  // Follow-up question (uses "yang", "nya", "soal", "dari tadi") often refers to prior context — don't trigger tools
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

  const enableTools = shouldUseTools(question)
  const tools = enableTools ? getToolDefinitions() : undefined

  // Build messages: system + history + user
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(narrative) },
  ]
  // Keep last N turns only
  const trimmed = history.slice(-MAX_HISTORY_TURNS * 2)
  for (const turn of trimmed) {
    messages.push({ role: turn.role === 'user' ? 'user' : 'assistant', content: turn.content })
  }
  messages.push({ role: 'user', content: question })

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
      messages.push({
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
        messages.push({
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
