// app/(dashboard)/admin/users/UserListClient.tsx
// Client-side wrapper for admin/users with search, role filter, and pagination.

'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useSelectableRows } from '@/hooks/use-selectable-rows'
import { useQueryClient } from '@tanstack/react-query'
import { useEntityList, type ListResponse } from '@/hooks'
import Link from 'next/link'
import { Search, Filter, X, ChevronRight, Users, Mail, Phone, CheckSquare, Edit3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BulkActionBar } from '@/components/ui/BulkActionBar'
import { UserCardList } from '@/components/admin/user-card-list'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/Pagination'
import { InlineEdit } from '@/components/ui/inline-edit'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { SwipeableRow } from '@/components/ui/swipeable-row'
import { BulkEditDialog } from '@/components/ui/bulk-edit-dialog'
import { useUndoToast } from '@/hooks/use-undo-toast'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const [editingUser, setEditingUser] = useState<UserRow | null>(null)

  const divName = useMemo(
    () => new Map(divisions.map(d => [d.id, d.name])),
    [divisions]
  )

  // Phase 2: migrated to useEntityList (saves ~15 LOC, preserves queryKey for cache continuity)
  const { data, isLoading } = useEntityList<UserRow>('users', {
    page, pageSize, q, role: role === 'all' ? '' : role, division: division === 'all' ? '' : division,
  }, {
    queryOptions: {
      // Preserve SSR-friendly placeholderData behavior
      placeholderData: page === 1 && !q && role === 'all' && division === 'all'
        ? { data: initialData, total: initialTotal, page: 1, pageSize } as ListResponse<UserRow>
        : undefined,
    },
  })

  const rows = data?.data ?? initialData
  const total = data?.total ?? initialTotal

  const rowIds = useMemo(() => rows.map((u) => u.id), [rows])
  const selection = useSelectableRows(rowIds)
  const showUndoToast = useUndoToast()
  const { handleConflict } = useConflictResolver()
  const [bulkEditOpen, setBulkEditOpen] = useState(false)

  // Available fields for bulk edit (from users schema)
  const bulkEditFields = [
    { name: 'is_active', label: 'Status Aktif', options: [
      { value: 'true', label: 'Aktif' },
      { value: 'false', label: 'Nonaktif' },
    ]},
    { name: 'division_id', label: 'Divisi' },
    { name: 'position', label: 'Posisi' },
    { name: 'phone', label: 'No HP' },
    { name: 'email', label: 'Email' },
  ]

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
            name="role" autoComplete="off"
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
            name="division" autoComplete="off"
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
          <UserCardList
            users={rows}
            divisions={divisions}
            onEdit={(user) => {
              setEditingUser(user as unknown as UserRow)
            }}
            onSave={async (userId, field, value) => {
              await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value }),
              })
              queryClient.invalidateQueries({ queryKey: ['users'] })
            }}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)]">
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={selection.allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = selection.someSelected
                      }}
                      onChange={selection.toggleAll}
                      aria-label="Pilih semua"
                      className="h-4 w-4 rounded border-[var(--color-border-default)] text-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
                    />
                  </th>
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
                      <td colSpan={6} className="p-3">
                        <div className="h-4 bg-[var(--color-surface-2)] rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                      Tidak ada user yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  rows.map(u => {
                    const r = ROLE_LABELS[u.role] || { label: u.role, variant: 'default' as const }
                    return (
                      <tr key={u.id} className={cn("border-b border-[var(--color-border-default)]/50 hover:bg-[var(--color-surface-2)]/50 transition-colors cursor-pointer", selection.isSelected(u.id) && 'bg-[var(--color-brand-500)]/5')} onClick={(e) => {
                            // Don't open if clicking InlineEdit or checkbox
                            const t = e.target as HTMLElement
                            if (t.closest('[data-inline-edit]') || t.closest('[data-bulk-checkbox]')) return
                            setEditingUser(u)
                          }}>
                        <td className="p-3" data-bulk-checkbox onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selection.isSelected(u.id)}
                            onChange={() => selection.toggle(u.id)}
                            aria-label={`Pilih ${u.full_name}`}
                            className="h-4 w-4 rounded border-[var(--color-border-default)] text-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20 cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="block group"
                            aria-label={`Buka detail ${u.full_name}`}
                          >
                            <div className="font-medium text-[var(--color-brand-500)] group-hover:underline inline-flex items-center gap-1">
                              <SmartInlineEdit
                                value={u.full_name}
                                type="text"
                                entity="users"
                                field="full_name"
                                aria-label="Nama user"
                                validate={(v) => !String(v).trim() ? 'Nama tidak boleh kosong' : null}
                                baseRow={u as unknown as Record<string, unknown>}
                                onConflict={handleConflict({
                                  table: 'users',
                                  rowLabel: u.full_name,
                                  baseRow: u as unknown as Parameters<typeof handleConflict>[0]['baseRow'],
                                  save: async (values) => {
                                    await fetch(`/api/users/${u.id}`, {
                                      method: 'PATCH',
                                      credentials: 'include',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(values),
                                    })
                                    queryClient.invalidateQueries({ queryKey: ['users'] })
                                  },
                                })}
                                onUndo={(oldName, newName) => {
                                  showUndoToast({
                                    title: 'Nama user diperbarui',
                                    message: `${oldName} → ${newName}`,
                                    onUndo: async () => {
                                      await fetch(`/api/users/${u.id}`, {
                                        method: 'PATCH',
                                        credentials: 'include',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ full_name: oldName }),
                                      })
                                      queryClient.invalidateQueries({ queryKey: ['users'] })
                                    },
                                  })
                                }}
                                onSave={async (newName) => {
                                  await fetch(`/api/users/${u.id}`, {
                                    method: 'PATCH',
                                    credentials: 'include',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ full_name: newName }),
                                  })
                                  queryClient.invalidateQueries({ queryKey: ['users'] })
                                }}
                                className="font-medium text-[var(--color-brand-500)]"
                              />
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
          

      <BulkActionBar
        selectedCount={selectedIds.size}
        total={data?.total ?? 0}
        onClear={() => setSelectedIds(new Set())}
      >
        <button
          type="button"
          onClick={() => setBulkEditOpen(true)}
          className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/15 hover:bg-white/25 transition flex items-center gap-1.5"
          aria-label="Bulk edit banyak field"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit Banyak
        </button>
        <button
          type="button"
          onClick={async () => {
            const ids = Array.from(selectedIds)
            if (!confirm(`Set ${ids.length} user ke status aktif?`)) return
            const res = await fetch('/api/bulk-update/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ ids, fields: { is_active: true } }),
            })
            if (res.ok) {
              queryClient.invalidateQueries({ queryKey: ['users'] })
              setSelectedIds(new Set())
            } else {
              const body = await res.json().catch(() => ({}))
              alert(`Gagal: ${body.error || res.statusText}`)
            }
          }}
          className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/15 hover:bg-white/25 transition flex items-center gap-1.5"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          Set Aktif
        </button>
      </BulkActionBar>

      <BulkEditDialog
        open={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        entity="users"
        ids={Array.from(selectedIds)}
        availableFields={bulkEditFields}
        onComplete={() => {
          setSelectedIds(new Set())
          queryClient.invalidateQueries({ queryKey: ['users'] })
        }}
      />

      <DetailSheet
        table="users"
        rowId={editingUser?.id ?? null}
        data={editingUser as unknown as Record<string, unknown>}
        open={!!editingUser}
        onOpenChange={(o) => !o && setEditingUser(null)}
        mode="edit"
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['users'] })
        }}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ['users'] })
          setEditingUser(null)
        }}
      />

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
