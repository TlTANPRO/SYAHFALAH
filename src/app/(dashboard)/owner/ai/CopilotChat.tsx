// app/(dashboard)/owner/ai/CopilotChat.tsx
'use client'

import { useState } from 'react'
import { Send, Loader2, Brain, AlertTriangle, ExternalLink, Wrench } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Step {
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

interface Message {
  role: 'user' | 'ai'
  text: string
  intent?: string
  ts: string
  provider?: string
  total_ms?: number
  iterations?: number
  steps?: Step[]
}

const SUGGESTIONS_INTERNAL = [
  'Apa status bisnis minggu ini?',
  'Sebutkan blocker utama',
  'Ringkas kondisi lead dan KPI',
  'Berapa pending approval saat ini?',
]

const SUGGESTIONS_EXTERNAL = [
  'Cek tren BI rate 2026',
  'Berita properti Jakarta terbaru',
  'Apa itu SP3K dan apa bedanya dengan SHM?',
  'https://www.cnnindonesia.com/ekonomi/uang',
]

export function CopilotChat() {
  const [msgs, setMsgs] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [providers, setProviders] = useState<{ name: string; keys?: number; configured?: boolean }[] | null>(null)

  async function ask(q: string) {
    if (!q.trim()) return
    // Build history: last 5 user+assistant exchanges (10 entries)
    const hist = msgs.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
    setMsgs(m => [...m, { role: 'user', text: q, ts: new Date().toISOString() }])
    setQuestion('')
    setBusy(true)
    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ question: q, history: hist }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsgs(m => [...m, { role: 'ai', text: `Error: ${j.error ?? `HTTP ${res.status}`}`, ts: new Date().toISOString() }])
        return
      }
      const j = await res.json()
      setMsgs(m => [...m, {
        role: 'ai',
        text: j.answer ?? '(no answer)',
        intent: j.intent,
        provider: j.provider,
        total_ms: j.total_ms,
        iterations: j.iterations,
        steps: j.steps ?? [],
        ts: j.ts ?? new Date().toISOString(),
      }])
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'ai', text: `Network error: ${e?.message ?? 'failed'}`, ts: new Date().toISOString() }])
    } finally {
      setBusy(false)
    }
  }

  // Probe providers on mount
  if (providers === null && typeof window !== 'undefined') {
    fetch('/api/ai/copilot', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setProviders(j.providers ?? []))
      .catch(() => setProviders([]))
  }

  const external = (q: string) => /https?:\/\/|tren|news|berita|video|artikel|riset|outlook|global|competitor|youtube|tiktok|instagram|twitter/i.test(q)

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Brain className="h-4 w-4 text-[var(--color-brand-500)]" />
            <span className="text-sm font-medium">Saran pertanyaan</span>
            <span className="text-xs text-[var(--color-text-tertiary)]">— klik chip atau paste URL untuk uji web tool</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS_INTERNAL.map((s, i) => (
              <button key={`i${i}`} type="button" disabled={busy}
                onClick={() => ask(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS_EXTERNAL.map((s, i) => (
              <button key={`e${i}`} type="button" disabled={busy}
                onClick={() => ask(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-surface-1)] text-[var(--color-brand-500)] hover:bg-[var(--color-brand-500)]/10 border border-[var(--color-brand-500)]/30 disabled:opacity-50 inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--color-border-subtle)] max-h-[60vh] overflow-y-auto">
            {msgs.length === 0 && (
              <div className="px-4 py-12 text-center">
                <Brain className="h-10 w-10 mx-auto text-[var(--color-text-tertiary)] mb-2" />
                <p className="text-sm text-[var(--color-text-muted)]">
                  Mulai dengan mengklik saran atau ketik pertanyaan.
                </p>
                {providers && providers.length > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-500">
                    AI: {providers.filter(p => p.configured !== false).map(p => `${p.name}(${p.keys ?? 1})`).join(' + ')}
                  </div>
                )}
                {providers && providers.every(p => p.configured === false) && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-500">
                    <AlertTriangle className="h-3 w-3" />
                    Mode fallback (deterministic) — semua provider offline.
                  </div>
                )}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`px-4 py-3 ${m.role === 'user' ? 'bg-[var(--color-surface-2)]' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    m.role === 'user'
                      ? 'bg-[var(--color-brand-500)] text-white'
                      : 'bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)]'
                  }`}>
                    {m.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">{m.role === 'user' ? 'Anda' : 'SyhfalAI'}</span>
                      {m.intent && <Badge variant="outline">{m.intent}</Badge>}
                      {m.provider && (
                        <Badge variant={m.provider === 'deterministic' ? 'warning' : 'success'}>
                          {m.provider}
                        </Badge>
                      )}
                      {m.total_ms != null && (
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">
                          {m.total_ms}ms · {m.iterations ?? 1} step
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">
                        {new Date(m.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-1 text-sm whitespace-pre-wrap leading-relaxed">{m.text}</div>
                    {m.steps && m.steps.length > 0 && (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-500)]">
                          Trace ({m.steps.length} step)
                        </summary>
                        <div className="mt-2 space-y-1 font-mono text-[11px]">
                          {m.steps.map((s, j) => (
                            <div key={j} className="flex items-start gap-2">
                              <span className={`flex-shrink-0 inline-block px-1.5 rounded ${
                                s.kind === 'tool' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' :
                                s.kind === 'final' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' :
                                s.kind === 'fallback' ? 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300' :
                                'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                              }`}>{s.kind}</span>
                              {s.kind === 'tool' && (
                                <span className="flex-1 break-all">
                                  <Wrench className="inline h-3 w-3 mr-1" />
                                  {s.tool_name} ({s.tool_ok ? '✓' : '✗'}) {s.tool_result ? `→ ${s.tool_result.slice(0, 120)}` : ''}
                                </span>
                              )}
                              {s.kind !== 'tool' && (
                                <span className="flex-1">
                                  {s.provider ? `${s.provider}/${s.model ?? '?'}` : ''}
                                  {s.ms ? ` ${s.ms}ms` : ''}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {busy && (
              <div className="px-4 py-3 bg-[var(--color-surface-1)]">
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sedang berpikir (max 18 detik)…
                </div>
              </div>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(question) }} className="border-t border-[var(--color-border-subtle)] p-3 flex gap-2">
            <input name="input" type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
              disabled={busy}
              placeholder="Tanya apa saja — paste URL atau ketik pertanyaan…"
              className="flex-1 h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
            <button type="submit" disabled={busy || !question.trim()}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[var(--color-brand-500)] text-white text-sm font-medium hover:bg-[var(--color-brand-600)] disabled:opacity-50">
              <Send className="h-4 w-4" />
              Tanya
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
