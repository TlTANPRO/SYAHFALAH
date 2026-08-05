// app/(dashboard)/kepala-kantor/team/TeamClient.tsx
// Card-grid for divisions + member count.

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Search, X, Users, ChevronRight } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'

interface TeamCard {
  id: string
  name: string
  description: string | null
  member_count: number
}

interface Props {
  initialData: TeamCard[]
  total: number
}

export function TeamClient({ initialData, total: initialTotal }: Props) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12

  const { data, isLoading } = useQuery({
    queryKey: ['kepala-team', q, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (q) params.set('q', q)
      const res = await fetch(`/api/team?${params}`, { credentials: 'include' })
      if (!res.ok) return { data: [], total: 0, page, pageSize }
      return res.json()
    },
    placeholderData: page === 1 && !q
      ? { data: initialData, total: initialTotal, page: 1, pageSize }
      : undefined,
  })

  const rows = data?.data ?? initialData
  const total = data?.total ?? initialTotal

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)] pointer-events-none" aria-hidden="true" />
        <input
          id="team-search"
          name="q"
          type="text"
          autoComplete="off"
          placeholder="Cari divisi…"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1) }}
          aria-label="Cari divisi"
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

      <div className="text-xs text-[var(--color-text-tertiary)]" aria-live="polite">
        {q ? `${total} divisi cocok` : `Total ${total} divisi`}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card">
              <div className="card-body p-4 space-y-2">
                <div className="h-4 bg-[var(--color-surface-2)] rounded animate-pulse" />
                <div className="h-3 bg-[var(--color-surface-2)]/60 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12 text-sm text-[var(--color-text-tertiary)]">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
            Tidak ada divisi yang cocok dengan filter.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((t: TeamCard) => (
            <Link
              key={t.id}
              href={`/divisi/${t.id}`}
              className="card group block hover:bg-[var(--color-surface-2)] hover:border-[var(--color-brand-500)] transition-all motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2"
              aria-label={`Buka ${t.name} dengan ${t.member_count} anggota`}
            >
              <div className="card-body p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-500)]">{t.name}</h3>
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                {t.description && (
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-3">{t.description}</p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  <span className="font-mono tabular-nums">{t.member_count}</span>
                  <span>anggota</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        className="border-t border-[var(--color-border-subtle)]"
      />
    </div>
  )
}
