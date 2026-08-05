// app/(dashboard)/owner/kpi/KpiListClient.tsx
// Client-side wrapper for owner/kpi with search, division/period filters,
// and pagination. Same UX pattern as admin/users/UserListClient.

'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Search, Filter, X, ChevronRight, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/Pagination'
import { formatValue } from '@/lib/format'

export interface KpiRow {
  id: string
  code: string | null
  name: string | null
  level: string
  unit: string | null
  division_id: string | null
  baseline_target_value: number | null
  actual_value: number | null
  progress: number | null
  status: string | null
  period: string | null
}

interface ApiResponse {
  data: KpiRow[]
  total: number
  page: number
  pageSize: number
}

interface Props {
  divisions: { id: string; name: string }[]
  periods: string[]
  initialData: KpiRow[]
  total: number
}

const STATUS_VARIANT: Record<string, string> = {
  achieved: 'success',
  on_track: 'info',
  at_risk: 'warning',
  off_track: 'danger',
}
const STATUS_LABEL: Record<string, string> = {
  achieved: 'Tercapai',
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
}

export function KpiListClient({ divisions, periods, initialData, total: initialTotal }: Props) {
  const [q, setQ] = useState('')
  const [division, setDivision] = useState<string>('all')
  const [period, setPeriod] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 25

  const divName = useMemo(
    () => new Map(divisions.map(d => [d.id, d.name])),
    [divisions]
  )

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['owner-kpis', q, division, period, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (q) params.set('q', q)
      if (division !== 'all') params.set('division', division)
      if (period !== 'all') params.set('period', period)
      const res = await fetch(`/api/kpis?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) return { data: [], total: 0, page, pageSize }
      return res.json()
    },
    placeholderData: page === 1 && !q && division === 'all' && period === 'all'
      ? { data: initialData, total: initialTotal, page: 1, pageSize }
      : undefined,
  })

  const rows = data?.data ?? initialData
  const total = data?.total ?? initialTotal

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)] pointer-events-none" aria-hidden="true" />
          <input
            id="kpi-search"
            name="q"
            type="text"
            autoComplete="off"
            placeholder="Cari kode atau nama KPI…"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            aria-label="Cari KPI"
            className="w-full h-11 pl-10 pr-10 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(''); setPage(1) }}
              aria-label="Bersihkan pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)] pointer-events-none" aria-hidden="true" />
          <select
            id="kpi-division-filter"
            name="division"
            value={division}
            onChange={e => { setDivision(e.target.value); setPage(1) }}
            aria-label="Filter divisi"
            className="h-11 pl-10 pr-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          >
            <option value="all">Semua divisi</option>
            {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="relative">
          <select
            id="kpi-period-filter"
            name="period"
            value={period}
            onChange={e => { setPeriod(e.target.value); setPage(1) }}
            aria-label="Filter periode"
            className="h-11 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          >
            <option value="all">Semua periode</option>
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="text-xs text-[var(--color-text-tertiary)]" aria-live="polite">
        {q || division !== 'all' || period !== 'all'
          ? `${total} KPI cocok`
          : `Total ${total} KPI`}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)]">
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">KPI</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Level</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Divisi</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Periode</th>
                  <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Progress</th>
                  <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Target</th>
                  <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Actual</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-border-default)]/50">
                      <td colSpan={8} className="p-3">
                        <div className="h-4 bg-[var(--color-surface-2)] rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                      Tidak ada KPI yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  rows.map(k => (
                    <tr key={k.id} className="border-b border-[var(--color-border-default)]/50 hover:bg-[var(--color-surface-2)]/50 transition-colors">
                      <td className="p-3">
                        <Link
                          href={k.code ? `/kpi/${encodeURIComponent(k.code)}` : `/kpi/${k.id}`}
                          className="block group"
                          aria-label={`Buka detail ${k.code ?? k.name ?? 'KPI'}`}
                        >
                          <div className="font-medium text-[var(--color-brand-500)] group-hover:underline inline-flex items-center gap-1">
                            {k.name}
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mt-0.5 group-hover:text-[var(--color-brand-500)]">{k.code}</div>
                        </Link>
                      </td>
                      <td className="p-3">
                        <span className="pill" data-variant={k.level === 'company' ? 'brand' : 'neutral'}>
                          {k.level === 'company' ? 'Perusahaan' : 'Divisi'}
                        </span>
                      </td>
                      <td className="p-3 text-[var(--color-text-secondary)]">
                        {k.division_id ? divName.get(k.division_id) ?? '—' : '—'}
                      </td>
                      <td className="p-3 text-[var(--color-text-secondary)] tabular-nums">
                        {k.period ?? '—'}
                      </td>
                      <td className="p-3 text-right tabular-nums font-mono font-semibold">
                        {k.progress != null ? `${k.progress.toFixed(0)}%` : '—'}
                      </td>
                      <td className="p-3 text-right tabular-nums font-mono">
                        {formatValue(k.baseline_target_value, k.unit)}
                      </td>
                      <td className="p-3 text-right tabular-nums font-mono">
                        {formatValue(k.actual_value, k.unit)}
                      </td>
                      <td className="p-3">
                        {k.status && (
                          <span className="pill" data-variant={STATUS_VARIANT[k.status] ?? 'neutral'}>
                            {STATUS_LABEL[k.status] ?? k.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            className="border-t border-[var(--color-border-subtle)]"
          />
        </CardContent>
      </Card>
    </div>
  )
}
