// app/(dashboard)/owner/ai/CopilotChat.tsx
// TITAN chat UI. Streams Server-Sent Events (SSE) from /api/ai/copilot.
// Chunks arrive progressively via ReadableStream.

'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Brain, Wrench, Square } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Step {
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
  persona?: string
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
  streaming?: boolean
}

export function CopilotChat() {
  const [msgs, setMsgs] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function ask(q: string) {
    if (!q.trim()) return
    const hist = msgs.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
    const userMsg: Message = { role: 'user', text: q, ts: new Date().toISOString() }
    const aiPlaceholder: Message = { role: 'ai', text: '', ts: new Date().toISOString(), streaming: true, steps: [] }
    setMsgs(m => [...m, userMsg, aiPlaceholder])
    setQuestion('')
    setBusy(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: q, history: hist, stream: true }),
        signal: ctrl.signal,
      })

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}))
        setMsgs(m => m.map((msg, i) => i === m.length - 1 ? { ...msg, text: `Error: ${j.error ?? `HTTP ${res.status}`}`, streaming: false } : msg))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const exact = line.trim()
          if (!exact.startsWith('data:')) continue
          const payload = exact.slice(5).trim()
          if (!payload) continue
          try {
            const ev = JSON.parse(payload)
            setMsgs(m => {
              const last = m[m.length - 1]
              if (!last) return m
              if (ev.type === 'intent') {
                return m.map((msg, i) => i === m.length - 1 ? { ...msg, intent: ev.intent } : msg)
              } else if (ev.type === 'step' && ev.step) {
                const newSteps = [...(last.steps ?? []), ev.step as Step]
                return m.map((msg, i) => i === m.length - 1 ? { ...msg, steps: newSteps } : msg)
              } else if (ev.type === 'delta' && ev.text) {
                return m.map((msg, i) => i === m.length - 1 ? { ...msg, text: msg.text + ev.text } : msg)
              } else if (ev.type === 'done') {
                return m.map((msg, i) => i === m.length - 1 ? {
                  ...msg,
                  streaming: false,
                  provider: ev.provider ?? msg.provider,
                  total_ms: ev.total_ms ?? msg.total_ms,
                  iterations: ev.iterations ?? msg.iterations,
                } : msg)
              } else if (ev.type === 'error') {
                return m.map((msg, i) => i === m.length - 1 ? { ...msg, text: msg.text + `\n\n[error: ${ev.error}]`, streaming: false } : msg)
              }
              return m
            })
          } catch { /* skip malformed */ }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setMsgs(m => m.map((msg, i) => i === m.length - 1 ? { ...msg, text: `Network error: ${e?.message ?? 'failed'}`, streaming: false } : msg))
      } else {
        setMsgs(m => m.map((msg, i) => i === m.length - 1 ? { ...msg, streaming: false } : msg))
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  function stop() {
    abortRef.current?.abort()
  }

  // Auto-scroll to bottom
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [msgs])

  return (
    <Card>
      <CardContent className="p-0">
        <div ref={scrollRef} className="divide-y divide-[var(--color-border-subtle)] max-h-[70vh] overflow-y-auto">
          {msgs.length === 0 && (
            <div className="px-4 py-16 text-center">
              <Brain className="h-12 w-12 mx-auto text-[var(--color-text-tertiary)] mb-3" />
              <p className="text-sm text-[var(--color-text-muted)]">
                Ketik pertanyaan untuk memulai.
              </p>
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
                    <span className="text-xs font-medium">{m.role === 'user' ? 'Anda' : 'TITAN'}</span>
                    {m.intent && <Badge variant="outline">{m.intent}</Badge>}
                    {m.provider && (
                      <Badge variant="success">
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
                    {m.streaming && (
                      <span className="text-[10px] text-[var(--color-brand-500)] inline-flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> streaming
                      </span>
                    )}
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
                              s.kind === 'final' || s.kind === 'synth' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' :
                              s.kind === 'fallback' ? 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300' :
                              s.kind === 'critique' ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300' :
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
                                {s.provider ? `${s.provider}/${s.model ?? '?'}` : s.text?.slice(0, 80) ?? ''}
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
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(question) }} className="border-t border-[var(--color-border-subtle)] p-3 flex gap-2">
          <input name="input" type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
            disabled={busy}
            placeholder="Ketik pertanyaan…"
            className="flex-1 h-10 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20" />
          {busy ? (
            <button type="button" onClick={stop}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-zinc-500 text-white text-sm font-medium hover:bg-zinc-600">
              <Square className="h-4 w-4" /> Stop
            </button>
          ) : (
            <button type="submit" disabled={!question.trim()}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[var(--color-brand-500)] text-white text-sm font-medium hover:bg-[var(--color-brand-600)] disabled:opacity-50">
              <Send className="h-4 w-4" />
              Tanya
            </button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
