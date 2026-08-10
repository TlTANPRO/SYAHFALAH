// src/app/(dashboard)/owner/marketing/MarketingMobileView.tsx
// Client wrapper for mobile card list. Embedded in server page.
// Receives serialized row data + tab, handles edit + detail via URL.

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MobileCardList } from '@/components/ui/mobile-card-list'

interface Row {
  id: string
  [key: string]: unknown
}

interface Props {
  tab: 'customers' | 'surveys' | 'bookings' | 'sp3k' | 'akad'
  rows: Row[]
}

const TAB_FIELDS: Record<Props['tab'], { title: string; fields: Array<{ key: string; label: string; priority?: 1 | 2; editable?: boolean; type?: 'text' | 'number' | 'date' | 'select'; entity?: string; field?: string; render?: (v: unknown, row: Record<string, unknown>) => React.ReactNode; hideIfEmpty?: boolean }> }> = {
  customers: {
    title: 'full_name',
    fields: [
      { key: 'full_name', label: 'Nama', editable: true, type: 'text', entity: 'customers', field: 'full_name', priority: 1 },
      { key: 'phone', label: 'HP', editable: true, type: 'text', entity: 'customers', field: 'phone', hideIfEmpty: true },
      { key: 'email', label: 'Email', hideIfEmpty: true },
      { key: 'source', label: 'Source', hideIfEmpty: true, priority: 2 },
    ],
  },
  surveys: {
    title: 'result',
    fields: [
      { key: 'result', label: 'Hasil', editable: true, type: 'select', entity: 'surveys', field: 'result', priority: 1 },
      { key: 'customer_name', label: 'Customer', priority: 2 },
      { key: 'unit_type', label: 'Tipe Unit', hideIfEmpty: true },
      { key: 'created_at', label: 'Tanggal', hideIfEmpty: true },
    ],
  },
  bookings: {
    title: 'result',
    fields: [
      { key: 'result', label: 'Status', editable: true, type: 'select', entity: 'bookings', field: 'result', priority: 1 },
      { key: 'booking_date', label: 'Tanggal', hideIfEmpty: true },
      { key: 'customer_name', label: 'Customer', hideIfEmpty: true },
    ],
  },
  sp3k: {
    title: 'result',
    fields: [
      { key: 'result', label: 'Status', editable: true, type: 'select', entity: 'sp3k', field: 'result', priority: 1 },
      { key: 'customer_name', label: 'Customer', hideIfEmpty: true },
      { key: 'approved_at', label: 'Disetujui', hideIfEmpty: true },
    ],
  },
  akad: {
    title: 'result',
    fields: [
      { key: 'result', label: 'Status', editable: true, type: 'select', entity: 'akad', field: 'result', priority: 1 },
      { key: 'customer_name', label: 'Customer', hideIfEmpty: true },
      { key: 'akad_date', label: 'Tanggal Akad', hideIfEmpty: true },
    ],
  },
}

export function MarketingMobileView({ tab, rows }: Props) {
  const router = useRouter()
  const config = TAB_FIELDS[tab]
  const [savedIds, setSavedIds] = React.useState<Set<string>>(new Set())
  
  const handleSave = React.useCallback(
    async (rowId: string, field: string, value: string | number) => {
      await fetch(`/api/marketing/${tab}/${rowId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      // Mark as saved for optimistic UI
      setSavedIds((prev) => new Set(prev).add(`${rowId}:${field}`))
    },
    [tab]
  )
  
  const handleRowClick = React.useCallback(
    (row: Record<string, unknown>) => {
      // Navigate to detail via URL (works on mobile + desktop)
      const rowId = String(row.id ?? '')
      router.push(`/owner/marketing?tab=${tab}&id=${rowId}`)
    },
    [router, tab]
  )

  return (
    <MobileCardList
      rows={rows as unknown as Array<Record<string, unknown>>}
      titleField={config.title}
      fields={config.fields as unknown as Parameters<typeof MobileCardList>[0]['fields']}
      onRowClick={handleRowClick}
      onSave={handleSave}
      emptyState={
        <div className="sm:hidden text-center py-8 text-sm text-[var(--color-text-tertiary)]">
          Tidak ada data
        </div>
      }
    />
  )
}
