// app/(dashboard)/owner/targets/CascadeTree.tsx
// Interactive tree view for KPI cascade. Server passes roots + year,
// client manages expand/collapse state + filter and renders the tree.
//
// Pure presentational from the data we have — no fetch, no mutation.
// Edit-form + auto-recalculation are out of scope for Plan C Item 2.

'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Target, Zap, ZapOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface CascadeDefinition {
  id: string
  code: string
  name: string
  level: string
  cascade_level: string | null
  parent_kpi_id: string | null
}

export interface CascadeTarget {
  id: string
  kpi_definition_id: string
  period: string
  target_value: number
  parent_target_id: string | null
  cascade_period: string | null
  auto_calculate: boolean
}

export interface CascadeNode {
  definition: CascadeDefinition
  targets: CascadeTarget[]
  children: CascadeNode[]
  parentName: string | null
}

const CASCADE_BADGE: Record<string, { label: string; variant: 'default' | 'success' | 'info' | 'warning' }> = {
  company:  { label: 'Perusahaan', variant: 'default' },
  division: { label: 'Divisi',      variant: 'info' },
  pic:      { label: 'PIC',         variant: 'warning' },
  personal: { label: 'Personal',    variant: 'success' },
}

// Pretty period label → compact quarter/month/week/day indicator.
const PERIOD_LABELS: Record<string, string> = {
  yearly:    'Y',
  quarterly: 'Q',
  monthly:   'M',
  weekly:    'W',
  daily:     'D',
}

// Sum a numeric value safely (returns '—' if not finite).
function fmtVal(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('id-ID')
}

interface NodeRowProps {
  node: CascadeNode
  depth: number
  expanded: Record<string, boolean>
  toggle: (id: string) => void
}

function NodeRow({ node, depth, expanded, toggle }: NodeRowProps) {
  const isOpen = !!expanded[node.definition.id]
  const hasChildren = node.children.length > 0
  const cascadeBadge = node.definition.cascade_level
    ? CASCADE_BADGE[node.definition.cascade_level]
    : null

  // Bucket targets by cascade_period for compact display.
  const targetsByPeriod = useMemo(() => {
    const map = new Map<string, CascadeTarget[]>()
    for (const t of node.targets) {
      const key = t.cascade_period ?? 'manual'
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      // manual last
      if (a === 'manual') return 1
      if (b === 'manual') return -1
      return (PERIOD_LABELS[a] ?? '?').localeCompare(PERIOD_LABELS[b] ?? '?')
    })
  }, [node.targets])

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]',
        depth > 0 && 'ml-6'
      )}
    >
      <button
        type="button"
        onClick={() => toggle(node.definition.id)}
        className="flex items-center gap-3 w-full text-left p-3 hover:bg-[var(--color-surface-2)]/50 transition-colors"
        aria-expanded={isOpen}
      >
        {hasChildren || node.targets.length > 0 ? (
          isOpen
            ? <ChevronDown className="h-4 w-4 flex-shrink-0" />
            : <ChevronRight className="h-4 w-4 flex-shrink-0" />
        ) : (
          <span className="h-4 w-4" />
        )}
        <Target className="h-4 w-4 text-[var(--color-brand-500)] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-[var(--color-text-primary)] truncate">
              {node.definition.name}
            </span>
            {cascadeBadge && (
              <Badge variant={cascadeBadge.variant}>{cascadeBadge.label}</Badge>
            )}
            {node.parentName && (
              <Badge variant="outline">↑ {node.parentName}</Badge>
            )}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mt-0.5">
            {node.definition.code}
          </div>
        </div>
        <div className="text-xs text-[var(--color-text-tertiary)] tabular-nums">
          {node.targets.length} target
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-[var(--color-border-subtle)] px-4 py-3 space-y-3 text-sm">
          {/* Targets grouped by cascade_period */}
          {targetsByPeriod.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              Belum ada target tercatat untuk tahun {node.definition.code ? '' : ''}
              ini.
            </p>
          ) : (
            <div className="space-y-2">
              {targetsByPeriod.map(([periodKey, tgts]) => (
                <div key={periodKey}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      {periodKey === 'manual' ? 'Manual (belum ada cascade_period)' : periodKey}
                    </span>
                    {periodKey !== 'manual' && (
                      <Badge variant="outline">{PERIOD_LABELS[periodKey] ?? '?'}</Badge>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {tgts.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-md bg-[var(--color-surface-2)]/40 px-2 py-1.5"
                      >
                        <span className="text-xs tabular-nums font-mono text-[var(--color-text-secondary)]">
                          {t.period}
                        </span>
                        <span className="flex-1 text-right tabular-nums font-mono text-sm">
                          {fmtVal(t.target_value)}
                        </span>
                        {t.auto_calculate ? (
                          <span title="Auto-calculate saat parent berubah" className="inline-flex">
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                        ) : (
                          <ZapOff className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] opacity-50" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Child nodes */}
          {hasChildren && (
            <div className="pt-2 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Turunan ({node.children.length})
              </p>
              {node.children.map((c) => (
                <NodeRow
                  key={c.definition.id}
                  node={c}
                  depth={depth + 1}
                  expanded={expanded}
                  toggle={toggle}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  roots: CascadeNode[]
  year: number
}

export function CascadeTree({ roots, year }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // Expand first root by default for empty-state discoverability.
    const init: Record<string, boolean> = {}
    for (const r of roots) init[r.definition.id] = true
    return init
  })

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const expandAll = () => {
    const all: Record<string, boolean> = {}
    const walk = (n: CascadeNode) => {
      all[n.definition.id] = true
      for (const c of n.children) walk(c)
    }
    for (const r of roots) walk(r)
    setExpanded(all)
  }

  const collapseAll = () => {
    setExpanded({})
  }

  if (roots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cascade Tree</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--color-text-muted)] text-center py-8">
          Belum ada KPI definition untuk tahun {year}.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Cascade Tree ({roots.length} root)</CardTitle>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-[var(--color-brand-500)] hover:underline"
          >
            Expand all
          </button>
          <span className="text-xs text-[var(--color-text-tertiary)]">·</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-[var(--color-brand-500)] hover:underline"
          >
            Collapse all
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {roots.map((r) => (
            <NodeRow
              key={r.definition.id}
              node={r}
              depth={0}
              expanded={expanded}
              toggle={toggle}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
