// src/app/(dashboard)/owner/projects/ProjectsMobileView.tsx
// Client wrapper for mobile card list. Embedded in projects server page.

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MobileCardList } from '@/components/ui/mobile-card-list'

interface Row {
  id: string
  [key: string]: unknown
}

export function ProjectsMobileView({ rows }: { rows: Row[] }) {
  const router = useRouter()
  
  const handleSave = React.useCallback(
    async (rowId: string, field: string, value: string | number) => {
      await fetch(`/api/projects/projects/${rowId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      router.refresh()
    },
    [router]
  )
  
  const handleRowClick = React.useCallback(
    (row: Record<string, unknown>) => {
      router.push(`/owner/projects?id=${String(row.id)}`)
    },
    [router]
  )

  return (
    <MobileCardList
      rows={rows as unknown as Array<Record<string, unknown>>}
      titleField="name"
      fields={[
        { key: 'name', label: 'Nama', editable: true, type: 'text', entity: 'projects', field: 'name', priority: 1 },
        { key: 'client_name', label: 'Klien', hideIfEmpty: true, priority: 2 },
        { key: 'status', label: 'Status', editable: true, type: 'select', entity: 'projects', field: 'status' },
        { key: 'progress_pct', label: 'Progress', hideIfEmpty: true },
        { key: 'budget_rupiah', label: 'Budget', hideIfEmpty: true, render: (v) => v ? `Rp ${Number(v).toLocaleString('id-ID')}` : '—' },
      ]}
      onRowClick={handleRowClick}
      onSave={handleSave}
      emptyState={
        <div className="sm:hidden text-center py-8 text-sm text-[var(--color-text-tertiary)]">
          Belum ada project
        </div>
      }
    />
  )
}
