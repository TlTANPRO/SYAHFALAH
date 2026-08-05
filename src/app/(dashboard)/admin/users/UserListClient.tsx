// app/(dashboard)/admin/users/UserListClient.tsx
// Client-side wrapper for admin/users with search, role filter, and pagination.

'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Search, Filter, X, ChevronRight, Users, Mail, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/Pagination'

interface UserRow {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  role: string
  position: string | null
  division_id: string | null
  is_active: boolean
}

const ROLE_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'info' | 'warning' | 'destructive' }> = {
  owner: { label: 'Owner', variant: 'success' },
  kepala_kantor: { label: 'Kepala Kantor', variant: 'info' },
  pic_divisi: { label: 'PIC Divisi', variant: 'warning' },
  staff: { label: 'Staff', variant: 'default' },
}

interface ApiResponse {
  data: UserRow[]
  total: number
  page: number
  pageSize: number
}

interface Props {
  divisions: { id: string; name: string }[]
  initialData: UserRow[]
  total: number
}

export function UserListClient({ divisions, initialData, total: initialTotal }: Props) {
  const [q, setQ] = useState('')
  const [role, setRole] = useState<string>('all')
  const [division, setDivision] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 25

  const divName = useMemo(
    () => new Map(divisions.map(d => [d.id, d.name])),
    [divisions]
  )

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['admin-users', q, role, division, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (q) params.set('q', q)
      if (role !== 'all') params.set('role', role)
      if (division !== 'all') params.set('division', division)
      const res = await fetch(`/api/users?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) return { data: [], total: 0, page, pageSize }
      return res.json()
    },
    placeholderData: page === 1 && !q && role === 'all' && division === 'all'
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
            id="user-search"
            name="q"
            type="text"
            autoComplete="off"
            placeholder="Cari nama, email, posisi…"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            aria-label="Cari user"
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
            id="user-role-filter"
            name="role"
            value={role}
            onChange={e => { setRole(e.target.value); setPage(1) }}
            aria-label="Filter role"
            className="h-11 pl-10 pr-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          >
            <option value="all">Semua role</option>
            <option value="owner">Owner</option>
            <option value="kepala_kantor">Kepala Kantor</option>
            <option value="pic_divisi">PIC Divisi</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div className="relative">
          <select
            id="user-division-filter"
            name="division"
            value={division}
            onChange={e => { setDivision(e.target.value); setPage(1) }}
            aria-label="Filter divisi"
            className="h-11 px-3 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          >
            <option value="all">Semua divisi</option>
            {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="text-xs text-[var(--color-text-tertiary)]" aria-live="polite">
        {q || role !== 'all' || division !== 'all'
          ? `${total} user cocok`
          : `Total ${total} user`}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)]">
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Nama</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Role</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Divisi</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Kontak</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-border-default)]/50">
                      <td colSpan={5} className="p-3">
                        <div className="h-4 bg-[var(--color-surface-2)] rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                      Tidak ada user yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  rows.map(u => {
                    const r = ROLE_LABELS[u.role] || { label: u.role, variant: 'default' as const }
                    return (
                      <tr key={u.id} className="border-b border-[var(--color-border-default)]/50 hover:bg-[var(--color-surface-2)]/50 transition-colors">
                        <td className="p-3">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="block group"
                            aria-label={`Buka detail ${u.full_name}`}
                          >
                            <div className="font-medium text-[var(--color-brand-500)] group-hover:underline inline-flex items-center gap-1">
                              {u.full_name}
                              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-xs text-[var(--color-text-secondary)]">{u.position || '—'}</div>
                          </Link>
                        </td>
                        <td className="p-3">
                          <Badge variant={r.variant}>{r.label}</Badge>
                        </td>
                        <td className="p-3 text-[var(--color-text-secondary)]">
                          {u.division_id ? divName.get(u.division_id) || '—' : '—'}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5 text-xs text-[var(--color-text-secondary)]">
                            {u.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {u.email}
                              </span>
                            )}
                            {u.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {u.phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={u.is_active ? 'success' : 'outline'}>
                            {u.is_active ? 'Aktif' : 'Non-aktif'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })
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
