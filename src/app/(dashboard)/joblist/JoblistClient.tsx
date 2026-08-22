// src/app/(dashboard)/joblist/JoblistClient.tsx
// Client Component for /joblist. Live polling via TanStack Query, sheet
// tab strip, search, KPI cards, sortable 8-column table. Pure UI: no
// server calls beyond /api/joblist for refresh.

'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { CheckCircle, Clock, AlertTriangle, ListTodo, RefreshCcw, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { formatDate, cn } from '@/lib/utils'
import type { SheetKey } from '@/lib/sheets/sync'

// --- types ---

export type { SheetKey }

export interface JoblistRow {
  id: string
  sheet: SheetKey
  rowIdx: number
  title: string
  dueDate: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'
  category: string
  notes: string | null
  completedAt: string | null
  assigneeName: string | null
  assigneeId: string | null
  lastSyncedAt: string | null
}

export interface JoblistResponse {
  ok: boolean
  kpi: { today: number; total: number; overdue: number; done: number }
  bySheet: Record<SheetKey, JoblistRow[]>
  generatedAt: string
  diagnostic?: { onlyOneTab: boolean; sheetsWithData: string[] }
}

// --- sheet config ---

const SHEET_LABELS: Record<SheetKey, string> = {
  MASTER: 'Master',
  NISYA: 'Nisya',
  TDL_NISYA_HARIAN: 'TDL Nisya',
  TDL_RIZAL_HARIAN: 'TDL Rizal',
  NOFITA: 'Nofita',
  MADA: 'Mada',
  RIZAL: 'Rizal',
  AMIR: 'Amir',
  SDEX: 'SDEX',
  BACKUP_TM: 'Backup TM',
  BACKUP_WT: 'Backup WT',
}

const SHEET_ORDER: SheetKey[] = [
  'MASTER', 'MADA', 'NISYA', 'RIZAL', 'NOFITA', 'AMIR', 'SDEX',
  'TDL_NISYA_HARIAN', 'TDL_RIZAL_HARIAN', 'BACKUP_TM', 'BACKUP_WT',
]

// --- helpers ---

function daysLeft(dueDate: string | null, status: string): string {
  if (!dueDate) return '—'
  if (status === 'completed') return '✓'
  const today = new Date().toISOString().slice(0, 10)
  const due = new Date(dueDate)
  const now = new Date(today)
  const diff = Math.round((due.getTime() - now.getTime()) / 86_400_000)
  if (diff === 0) return 'Hari ini'
  if (diff > 0) return `${diff} hari lagi`
  return `Terlambat ${Math.abs(diff)} hari`
}

const PRIORITY_VARIANT: Record<JoblistRow['priority'], 'outline' | 'info' | 'warning' | 'destructive'> = {
  low: 'outline',
  medium: 'info',
  high: 'warning',
  critical: 'destructive',
}

const STATUS_VARIANT: Record<JoblistRow['status'], 'outline' | 'info' | 'success' | 'destructive'> = {
  pending: 'outline',
  in_progress: 'info',
  completed: 'success',
  overdue: 'destructive',
  cancelled: 'outline',
}

const STATUS_LABEL: Record<JoblistRow['status'], string> = {
  pending: 'Planned',
  in_progress: 'In Progress',
  completed: '✓ Done',
  overdue: 'Overdue',
  cancelled: 'Batal',
}

// --- component ---

type Props = { initial: JoblistResponse }

export function JoblistClient({ initial }: Props) {
  const router = useRouter()
  const [activeSheet, setActiveSheet] = useState<SheetKey>('MASTER')
  const [search, setSearch] = useState('')

  const { data, isFetching, refetch } = useQuery<JoblistResponse>({
    queryKey: ['joblist'],
    queryFn: async () => {
      const r = await fetch('/api/joblist', { credentials: 'include', cache: 'no-store' })
      if (!r.ok) throw new Error(`joblist ${r.status}`)
      return r.json() as Promise<JoblistResponse>
    },
    initialData: initial,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  })

  const kpi = data?.kpi ?? { today: 0, total: 0, overdue: 0, done: 0 }

  const rows = useMemo<JoblistRow[]>(() => {
    const raw = data?.bySheet?.[activeSheet] ?? []
    if (!search.trim()) return raw
    const q = search.toLowerCase()
    return raw.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.assigneeName ?? '').toLowerCase().includes(q),
    )
  }, [data, activeSheet, search])

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6 overflow-x-hidden">
      <Breadcrumbs crumbs={[{ label: 'Joblist', href: '/joblist' }]} />

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="display-lg">Joblist</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Mirror otomatis dari Google Sheets. Update tiap edit.
          </p>
        </div>
        <button
          onClick={() => { refetch(); router.refresh() }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--color-border)] text-xs hover:bg-[var(--color-surface-2)]/50 transition-colors"
          aria-label="Refresh joblist"
        >
          <RefreshCcw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          {data ? formatDate(data.generatedAt, { hour: '2-digit', minute: '2-digit' }) : '...'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Hari ini" value={kpi.today} icon={Clock} tone="info" />
        <KpiCard label="Total" value={kpi.total} icon={ListTodo} tone="brand" />
        <KpiCard label="Terlambat" value={kpi.overdue} icon={AlertTriangle} tone="danger" />
        <KpiCard label="Selesai" value={kpi.done} icon={CheckCircle} tone="success" />
      </div>

      {data?.diagnostic?.onlyOneTab && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-4 py-3 text-sm"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 text-[var(--color-warning)] flex-shrink-0" aria-hidden />
          <div>
            <div className="font-medium text-[var(--color-text-primary)]">Hanya 1 tab yang sync</div>
            <div className="mt-0.5 text-[var(--color-text-secondary)]">
              Cuma <code className="px-1 bg-[var(--color-surface-2)] rounded">{data.diagnostic.sheetsWithData[0]}</code> yang punya data. Tab lain kemungkinan restricted atau punya schema beda. Buka <code className="px-1 bg-[var(--color-surface-2)] rounded">/vercel-logs</code> untuk lihat detail, atau share spreadsheet sebagai "Anyone with the link can view".
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
        {SHEET_ORDER.map((s) => {
          const count = data?.bySheet?.[s]?.length ?? 0
          const active = activeSheet === s
          return (
            <button
              key={s}
              onClick={() => setActiveSheet(s)}
              aria-pressed={active}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                active
                  ? 'bg-[var(--color-brand-500)] text-primary-foreground'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]/50',
              )}
            >
              {SHEET_LABELS[s]}
              {count > 0 && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px]',
                  active ? 'bg-primary-foreground/20' : 'bg-[var(--color-surface-2)]',
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul, kategori, PIC..."
          className="pl-9 h-9"
          aria-label="Cari joblist"
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-[var(--color-text-secondary)]">
            {search ? `Tidak ada hasil untuk "${search}"` : `Tab ${SHEET_LABELS[activeSheet]} kosong`}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-2)]/50 border-b border-[var(--color-border)]">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Pekerjaan</th>
                  <th className="px-3 py-2 font-medium">Deadline</th>
                  <th className="px-3 py-2 font-medium">Prioritas</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium hidden md:table-cell">Kategori</th>
                  <th className="px-3 py-2 font-medium">Sisa</th>
                  <th className="px-3 py-2 font-medium hidden lg:table-cell">PIC</th>
                  <th className="px-3 py-2 font-medium hidden lg:table-cell">Selesai</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      'border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-2)]/30',
                      r.status === 'completed' && 'opacity-60',
                    )}
                  >
                    <td className="px-3 py-2 font-medium">{r.title}</td>
                    <td className="px-3 py-2 text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                      {r.dueDate ? formatDate(r.dueDate) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={PRIORITY_VARIANT[r.priority]} className="text-[10px]">
                        {r.priority}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_VARIANT[r.status]} className="text-[10px]">
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--color-text-secondary)] hidden md:table-cell">
                      {r.category}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className={cn(
                        r.status !== 'completed' && r.dueDate && r.dueDate < todayStr && 'text-[var(--color-danger)] font-medium',
                      )}>
                        {daysLeft(r.dueDate, r.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs hidden lg:table-cell">
                      {r.assigneeName ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--color-text-secondary)] hidden lg:table-cell whitespace-nowrap">
                      {r.completedAt ? formatDate(r.completedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  tone: 'info' | 'brand' | 'danger' | 'success'
}) {
  const toneClass = {
    info: 'text-[var(--color-info)]',
    brand: 'text-[var(--color-brand-500)]',
    danger: 'text-[var(--color-danger)]',
    success: 'text-[var(--color-success)]',
  }[tone]
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
          <Icon className={cn('h-4 w-4', toneClass)} aria-hidden />
        </div>
        <div className={cn('mt-2 text-2xl font-semibold tabular-nums', toneClass)}>{value}</div>
      </CardContent>
    </Card>
  )
}
