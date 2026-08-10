// src/app/(dashboard)/personal/tasks/TasksMobileView.tsx
// Client wrapper for mobile card list. Embedded in personal/tasks page.

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MobileCardList } from '@/components/ui/mobile-card-list'

interface Row {
  id: string
  [key: string]: unknown
}

export function TasksMobileView({ rows }: { rows: Row[] }) {
  const router = useRouter()
  
  const handleSave = React.useCallback(
    async (rowId: string, field: string, value: string | number) => {
      await fetch(`/api/tasks/${rowId}`, {
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
      router.push(`/personal/tasks?id=${String(row.id)}`)
    },
    [router]
  )

  return (
    <MobileCardList
      rows={rows as unknown as Array<Record<string, unknown>>}
      titleField="title"
      fields={[
        { key: 'title', label: 'Judul', editable: true, type: 'text', entity: 'tasks', field: 'title', priority: 1 },
        { key: 'priority', label: 'Prioritas', editable: true, type: 'select', entity: 'tasks', field: 'priority' },
        { key: 'status', label: 'Status', editable: true, type: 'select', entity: 'tasks', field: 'status' },
        { key: 'due_date', label: 'Tenggat', hideIfEmpty: true },
        { key: 'description', label: 'Deskripsi', hideIfEmpty: true },
      ]}
      onRowClick={handleRowClick}
      onSave={handleSave}
      emptyState={
        <div className="sm:hidden text-center py-8 text-sm text-[var(--color-text-tertiary)]">
          Tidak ada task
        </div>
      }
    />
  )
}
