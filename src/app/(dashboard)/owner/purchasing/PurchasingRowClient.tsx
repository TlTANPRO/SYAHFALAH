// app/(dashboard)/owner/purchasing/PurchasingRowClient.tsx
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { useQueryClient } from '@tanstack/react-query'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

interface Props {
  row: any
  tab: 'suppliers' | 'materials' | 'purchase_requests' | 'purchase_orders'
}

const TAB_TO_ENTITY: Record<Props['tab'], string> = {
  suppliers: 'suppliers',
  materials: 'materials',
  purchase_requests: 'purchase_requests',
  purchase_orders: 'purchase_orders',
}

const TAB_TO_FIELD: Record<Props['tab'], string> = {
  suppliers: 'name',
  materials: 'name',
  purchase_requests: 'title',
  purchase_orders: 'po_number',
}

export function PurchasingRowClient({ row, tab }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const { handleConflict } = useConflictResolver()
  const entity = TAB_TO_ENTITY[tab]
  const field = TAB_TO_FIELD[tab]

  return (
    <div className="flex items-center gap-2">
      <SmartInlineEdit
        value={row[field] ?? ''}
        type="text"
        entity={entity}
        field={field}
        aria-label={`Edit ${field}`}
        validate={(v) => !String(v).trim() ? 'Tidak boleh kosong' : null}
        baseRow={row}
        onConflict={handleConflict({
          table: entity,
          rowLabel: String(row[field] ?? ''),
          baseRow: row as unknown as Parameters<typeof handleConflict>[0]['baseRow'],
          save: async (values) => {
            await fetch(`/api/purchasing/${entity}/${row.id}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            })
            queryClient.invalidateQueries({ queryKey: ['purchasing'] })
            router.refresh()
          },
        })}
        onSave={async (newValue) => {
          await fetch(`/api/purchasing/${entity}/${row.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: newValue }),
          })
          queryClient.invalidateQueries({ queryKey: ['purchasing'] })
          router.refresh()
        }}
        className="font-medium hover:underline cursor-pointer"
      />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-500)] underline-offset-2 hover:underline"
        aria-label="Lihat detail"
      >
        Detail
      </button>
      <DetailSheet
        table={entity}
        rowId={row.id}
        data={row}
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['purchasing'] })
          router.refresh()
        }}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ['purchasing'] })
          router.refresh()
        }}
      />
    </div>
  )
}
