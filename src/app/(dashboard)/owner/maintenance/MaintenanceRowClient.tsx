// app/(dashboard)/owner/maintenance/MaintenanceRowClient.tsx
'use client'
import * as React from 'react'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { useRowSave } from '@/hooks/useRowSave'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

interface Props {
  row: any
  tab: 'tickets' | 'logs'
}

const TAB_TO_ENTITY: Record<Props['tab'], string> = {
  tickets: 'maintenance_tickets',
  logs: 'maintenance_logs',
}

export function MaintenanceRowClient({ row, tab }: Props) {
  const [open, setOpen] = React.useState(false)
  const entity = TAB_TO_ENTITY[tab]
  const field = tab === 'tickets' ? 'title' : 'action'
  const save = useRowSave({ endpoint: `maintenance/${entity}`, queryKey: 'maintenance' })
  const { handleConflict } = useConflictResolver()

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
          save: (values) => save.patch({ id: row.id, values }),
        })}
        onSave={(newValue) => save.patch({ id: row.id, values: { [field]: newValue } })}
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
        onSaved={save.invalidate}
        onDeleted={save.invalidate}
      />
    </div>
  )
}
