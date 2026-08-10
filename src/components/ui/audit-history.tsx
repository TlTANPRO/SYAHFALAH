// src/components/ui/audit-history.tsx
// Timeline of changes for a row. Used in DetailSheet history tab.

'use client'

import * as React from 'react'
import { History, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditEntry {
  id: string
  user_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  created_at: string
  users?: { name: string } | null
}

interface Props {
  table: string
  rowId: string
  className?: string
}

const ACTION_LABELS: Record<AuditEntry['action'], { label: string; icon: typeof Pencil; color: string }> = {
  INSERT: { label: 'Dibuat', icon: Plus, color: 'text-[var(--color-success)]' },
  UPDATE: { label: 'Diubah', icon: Pencil, color: 'text-[var(--color-brand-500)]' },
  DELETE: { label: 'Dihapus', icon: Trash2, color: 'text-[var(--color-danger)]' },
}

function diffFields(before: Record<string, unknown> | null, after: Record<string, unknown> | null): Array<{ field: string; from: unknown; to: unknown }> {
  if (!before || !after) return []
  const changes: Array<{ field: string; from: unknown; to: unknown }> = []
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const key of allKeys) {
    if (['id', 'created_at', 'updated_at'].includes(key)) continue
    const bv = before[key]
    const av = after[key]
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      changes.push({ field: key, from: bv, to: av })
    }
  }
  return changes
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak'
  if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  const s = String(v)
  return s.length > 60 ? s.slice(0, 60) + '...' : s
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function AuditHistory({ table, rowId, className }: Props) {
  const [entries, setEntries] = React.useState<AuditEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/audit/${table}/${rowId}?limit=50`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((body) => {
        if (!cancelled) {
          setEntries(Array.isArray(body.data) ? body.data : [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [table, rowId])

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-[var(--color-surface-2)] rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <History className="h-8 w-8 text-[var(--color-text-tertiary)] opacity-50 mb-2" aria-hidden />
        <p className="text-sm text-[var(--color-text-tertiary)]">
          Belum ada riwayat perubahan.
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
          Aktifkan audit log dengan migration <code className="font-mono">create_api_audit_log</code>.
        </p>
      </div>
    )
  }

  return (
    <ol className={cn('space-y-2 relative', className)}>
      <div className="absolute left-4 top-2 bottom-2 w-px bg-[var(--color-border-default)]" aria-hidden />
      {entries.map((e) => {
        const meta = ACTION_LABELS[e.action]
        const Icon = meta.icon
        const changes = e.action === 'UPDATE' ? diffFields(e.before, e.after) : []
        const isExpanded = expandedId === e.id
        return (
          <li key={e.id} className="relative pl-10">
            <div className={cn(
              'absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-surface-1)] border border-[var(--color-border-default)]',
              meta.color
            )}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </div>
            <button
              type="button"
              onClick={() => changes.length > 0 && setExpandedId(isExpanded ? null : e.id)}
              className={cn(
                'w-full text-left rounded-md p-2 hover:bg-[var(--color-surface-2)] transition-colors',
                changes.length === 0 && 'cursor-default'
              )}
              aria-expanded={isExpanded}
              aria-label={`${meta.label} oleh ${e.users?.name ?? 'Anonim'} ${relTime(e.created_at)}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {meta.label}
                  {e.users?.name && <span className="text-[var(--color-text-tertiary)] font-normal"> oleh {e.users.name}</span>}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                  {relTime(e.created_at)}
                  {changes.length > 0 && (
                    <ChevronRight className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')} />
                  )}
                </span>
              </div>
              {isExpanded && changes.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {changes.slice(0, 10).map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-[var(--color-text-tertiary)] min-w-[80px] truncate">{c.field}</span>
                      <span className="text-[var(--color-danger)] line-through truncate">{formatValue(c.from)}</span>
                      <span className="text-[var(--color-text-tertiary)]">→</span>
                      <span className="text-[var(--color-success)] truncate">{formatValue(c.to)}</span>
                    </li>
                  ))}
                  {changes.length > 10 && (
                    <li className="text-[var(--color-text-tertiary)] italic">
                      + {changes.length - 10} perubahan lainnya
                    </li>
                  )}
                </ul>
              )}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
