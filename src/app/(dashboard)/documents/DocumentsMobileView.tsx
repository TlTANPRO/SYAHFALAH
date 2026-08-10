// src/app/(dashboard)/documents/DocumentsMobileView.tsx
// Client wrapper for mobile card list. Embedded in documents page.

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MobileCardList } from '@/components/ui/mobile-card-list'

interface Doc {
  id: string
  [key: string]: unknown
}

export function DocumentsMobileView({ rows }: { rows: Doc[] }) {
  const router = useRouter()
  
  const handleSave = React.useCallback(
    async (rowId: string, field: string, value: string | number) => {
      await fetch(`/api/documents/${rowId}`, {
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
      router.push(`/documents?id=${String(row.id)}`)
    },
    [router]
  )

  return (
    <MobileCardList
      rows={rows as unknown as Array<Record<string, unknown>>}
      titleField="title"
      fields={[
        { key: 'title', label: 'Judul', editable: true, type: 'text', entity: 'documents', field: 'title', priority: 1 },
        { key: 'category', label: 'Kategori', hideIfEmpty: true, priority: 2 },
        { key: 'file_type', label: 'Tipe', hideIfEmpty: true },
        { key: 'created_at', label: 'Dibuat', hideIfEmpty: true },
      ]}
      onRowClick={handleRowClick}
      onSave={handleSave}
      emptyState={
        <div className="sm:hidden text-center py-8 text-sm text-[var(--color-text-tertiary)]">
          Belum ada dokumen
        </div>
      }
    />
  )
}
