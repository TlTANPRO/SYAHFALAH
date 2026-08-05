// app/(dashboard)/owner/audit/AuditLogClient.tsx
// Interactive audit log table with search, filters, pagination, and a
// collapsible JSONB inspector for old_data + new_data. Read-only —
// no mutation triggers yet (separate sprint item).

'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Search, Filter, X, FileSearch } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/Pagination'

export interface AuditLogRow {
  id: string
  user_id: string | null
  action: string | null
  table_name: string | null
  record_id: string | null
  old_data: unknown
  new_data: unknown
  ip_address: string | null
  user_agent: string | null
  created_at: string | null
}

interface ApiResponse {
  data: AuditLogRow[]
  total: number
  page: number
  pageSize: number
}

interface Props {
  initialRows: AuditLogRow[]
  initialTotal: number
  knownActions: string[]
  knownTables: string[]
  knownUserIds: { id: string; full_name: string }[]
}

function fmtTs(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function safeJson(v: unknown): string {
  if (v == null) return ''
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}

export function AuditLogClient({ initialRows, initialTotal, knownActions, knownTables, knownUserIds }: Props) {
  const [q, setQ] = useState('')
  const [action, setAction] = useState('all')
  const [table, setTable] = useState('all')
  const [userId, setUserId] = useState('all')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const pageSize = 25

  const userNameById = useMemo(
    () => new Map(knownUserIds.map((u) => [u.id, u.full_name])),
    [knownUserIds]
  )

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['audit-logs', q, action, table, userId, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (q) params.set('q', q)
      if (action !== 'all') params.set('action', action)
      if (table !== 'all') params.set('table', table)
      if (userId !== 'all') params.set('user_id', userId)
      const res = await fetch(`/api/audit-logs?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) return { data: [], total: 0, page, pageSize }
      return res.json()
    },
    placeholderData:
      page === 1 && !q && action === 'all' && table === 'all' && userId === 'all'
        ? { data: initialRows, total: initialTotal, page: 1, pageSize }
        : undefined,
  })

  const rows = data?.data ?? initialRows
  const total = data?.total ?? initialTotal
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }))

  const userName = (id: string | null) =>
    id == null ? 'system' : (userNameById.get(id) ?? id.slice(0, 8))

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)] pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
            placeholder="Cari action atau nama tabel…"
            aria-label="Cari audit"
            className="w-full h-11 pl-10 pr-10 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
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
        <FilterSelect label="Aksi" value={action} onChange={(v) => { setAction(v); setPage(1) }} options={knownActions} />
        <FilterSelect label="Tabel" value={table} onChange={(v) => { setTable(v); setPage(1) }} options={knownTables} />
        <UserSelect value={userId} onChange={(v) => { setUserId(v); setPage(1) }} users={knownUserIds} />
      </div>

      <div className="text-xs text-[var(--color-text-tertiary)]" aria-live="polite">
        {q || action !== 'all' || table !== 'all' || userId !== 'all'
          ? `${total} event cocok`
          : `Total ${total} event`}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)]">
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)] w-8" aria-label="Expand" />
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Waktu</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Aksi</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Tabel</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Record</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">User</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">IP</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-border-default)]/50">
                      <td colSpan={7} className="p-3">
                        <div className="h-4 bg-[var(--color-surface-2)] rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">
                      <FileSearch className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                      Tidak ada audit event yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <FragmentRow
                      key={r.id}
                      row={r}
                      isOpen={!!expanded[r.id]}
                      onToggle={() => toggle(r.id)}
                      userName={userName(r.user_id)}
                    />
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

interface FragmentRowProps {
  row: AuditLogRow
  isOpen: boolean
  onToggle: () => void
  userName: string
}

function FragmentRow({ row, isOpen, onToggle, userName: who }: FragmentRowProps) {
  const hasPayload =
    row.old_data != null ||
    row.new_data != null ||
    row.user_agent != null
  return (
    <>
      <tr className="border-b border-[var(--color-border-default)]/50 hover:bg-[var(--color-surface-2)]/30 transition-colors">
        <td className="p-3 align-top">
          {hasPayload && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={isOpen ? 'Tutup detail' : 'Buka detail'}
              className="h-6 w-6 inline-flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)]"
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </td>
        <td className="p-3 tabular-nums text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
          {fmtTs(row.created_at)}
        </td>
        <td className="p-3 font-mono text-xs uppercase tracking-wide">
          {row.action ?? '—'}
        </td>
        <td className="p-3 font-mono text-xs">
          {row.table_name ?? '—'}
        </td>
        <td className="p-3 font-mono text-[10px] text-[var(--color-text-tertiary)] truncate max-w-[12rem]" title={row.record_id ?? ''}>
          {row.record_id ?? '—'}
        </td>
        <td className="p-3 text-xs truncate max-w-[10rem]" title={row.user_id ?? ''}>
          {who}
        </td>
        <td className="p-3 font-mono text-xs text-[var(--color-text-tertiary)]">
          {row.ip_address ?? '—'}
        </td>
      </tr>
      {isOpen && hasPayload && (
        <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]/40">
          <td colSpan={7} className="p-4 space-y-3">
            {row.user_agent && (
              <div>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-tertiary)] mb-1">User Agent</p>
                <p className="text-xs font-mono break-all">{row.user_agent}</p>
              </div>
            )}
            {row.old_data != null && (
              <div>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-tertiary)] mb-1">Old data</p>
                <pre className="text-xs font-mono bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] rounded p-3 overflow-x-auto">
                  {safeJson(row.old_data)}
                </pre>
              </div>
            )}
            {row.new_data != null && (
              <div>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-tertiary)] mb-1">New data</p>
                <pre className="text-xs font-mono bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] rounded p-3 overflow-x-auto">
                  {safeJson(row.new_data)}
                </pre>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <div className="relative">
      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)] pointer-events-none" aria-hidden="true" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Filter ${label}`}
        className="h-11 pl-10 pr-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
      >
        <option value="all">Semua {label.toLowerCase()}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

interface UserSelectProps {
  value: string
  onChange: (v: string) => void
  users: { id: string; full_name: string }[]
}

function UserSelect({ value, onChange, users }: UserSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filter user"
        className="h-11 pl-3 pr-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
      >
        <option value="all">Semua user</option>
        <option value="">System (null)</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.full_name}</option>
        ))}
      </select>
    </div>
  )
}
