// app/(dashboard)/owner/marketing/MarketingRow.tsx
// Client wrapper for inline edit + detail sheet on marketing rows.
// Each row is a customer / survey / booking / sp3k / akad.

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { InlineEdit } from '@/components/ui/inline-edit'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  row: Record<string, any>
  tab: 'customers' | 'surveys' | 'bookings' | 'sp3k' | 'akad'
  displayField: string // e.g. 'full_name' for customers
}

const TAB_TO_ENTITY: Record<Props['tab'], string> = {
  customers: 'customers',
  surveys: 'surveys',
  bookings: 'bookings',
  sp3k: 'sp3k',
  akad: 'akad',
}

const TAB_TO_SCHEMA: Record<Props['tab'], string> = {
  customers: 'customers',
  surveys: 'surveys',
  bookings: 'bookings',
  sp3k: 'sp3k',
  akad: 'akad',
}

export function MarketingRow({ row, tab, displayField }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const entity = TAB_TO_ENTITY[tab]
  const schemaEntity = TAB_TO_SCHEMA[tab]
  
  const displayValue = String(row[displayField] ?? '')

  return (
    <>
      <div 
        className="flex items-center gap-2 flex-wrap cursor-pointer hover:bg-[var(--color-surface-2)]/50 -mx-2 px-2 py-1 rounded transition-colors"
        onClick={() => setSheetOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setSheetOpen(true)
          }
        }}
        aria-label={`Lihat detail ${tab} ${displayValue}`}
      >
        <SmartInlineEdit
          value={displayValue}
          type="text"
          entity={schemaEntity}
          field={displayField}
          aria-label={`Edit ${displayField}`}
          validate={(v) => !String(v).trim() ? 'Nama tidak boleh kosong' : null}
          onSave={async (newValue) => {
            await fetch(`/api/marketing/${entity}/${row.id}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [displayField]: newValue }),
            })
            queryClient.invalidateQueries({ queryKey: ['marketing'] })
            router.refresh()
          }}
        />
      </div>

      <DetailSheet
        table={schemaEntity}
        rowId={row.id}
        data={row}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="edit"
        onSaved={(_row: Record<string, unknown>) => {
          queryClient.invalidateQueries({ queryKey: ['marketing'] })
          router.refresh()
        }}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ['marketing'] })
          router.refresh()
        }}
      />
    </>
  )
}
