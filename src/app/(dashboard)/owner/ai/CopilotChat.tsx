// app/(dashboard)/owner/ai/CopilotChat.tsx
'use client'

import { useState } from 'react'
import { Send, Loader2, Brain, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Message {
  role: 'user' | 'ai'
  text: string
  intent?: string
  ts: string
}

const SUGGESTIONS = [
  'Apa status bisnis minggu ini?',
  'Sebutkan blocker utama',
  'Ringkas kondisi lead dan KPI',
  'Berapa pending approval saat ini?',
]

export function CopilotChat() {
  const [msgs, setMsgs] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null)

  async function ask(q: string) {
    if (!q.trim()) return
    setMsgs(m => [...m, { role: 'user', text: q, ts: new Date().toISOString() }])
    setQuestion('')
    setBusy(true)
    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ question: q }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsgs(m => [...m, { role: 'ai', text: `Error: ${j.error ?? `HTTP ${res.status}`}`, ts: new Date().toISOString() }])
        return
      }
      const j = await res.json()
      setOllamaAvailable(j.ollama_available ?? false)
      const sourceTag = j.source === 'deterministic' ? ' [fallback]' : ''
      setMsgs(m => [...m, {
        role: 'ai',
        text: (j.answer ?? '(no answer)') + (sourceTag ? '' : ''),
        intent: j.intent ? `${j.intent}${sourceTag}` : sourceTag || undefined,
        ts: j.ts ?? new Date().toISOString(),
      }])
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'ai', text: `Network error: ${e?.message ?? 'failed'}`, ts: new Date().toISOString() }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Brain className="h-4 w-4 text-[var(--color-brand-500)]" />
            <span className="text-sm font-medium">Saran pertanyaan</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} type="button" disabled={busy}
                onClick={() => ask(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] disabled:opacity-50">
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
                  Mulai dengan mengklik saran atau ketik pertanyaan Anda di bawah.
                </p>
                {ollamaAvailable === false && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-500">
                    <AlertTriangle className="h-3 w-3" />
                    AI mode fallback (deterministic) — Ollama tidak tersedia. Set OLLAMA_HOST di Vercel env.
                  </div>
                )}
                {ollamaAvailable === true && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-500">
                    AI model aktif (Ollama {process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'gemma4:12b'}).
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
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">
                        {new Date(m.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-1 text-sm whitespace-pre-wrap leading-relaxed">{m.text}</div>
                  </div>
                </div>
              </div>
            ))}
            {busy && (
              <div className="px-4 py-3 bg-[var(--color-surface-1)]">
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sedang berpikir (max 12 detik)…
                </div>
              </div>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(question) }} className="border-t border-[var(--color-border-subtle)] p-3 flex gap-2">
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
              disabled={busy}
              placeholder="Ketik pertanyaan…"
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
