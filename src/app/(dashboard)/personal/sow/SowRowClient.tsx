// app/(dashboard)/personal/sow/SowRowClient.tsx
'use client'
import * as React from 'react'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { useRowSave } from '@/hooks/useRowSave'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

export function SowRowClient({ sow }: { sow: any }) {
  const [open, setOpen] = React.useState(false)
  // /api/sow-tasks/<id> + invalidate ['sow'].
  // Note: endpoint is kebab-case (sow-tasks) not snake_case (sow_tasks).
  const save = useRowSave({ endpoint: 'sow-tasks', queryKey: 'sow' })
  const { handleConflict } = useConflictResolver()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <SmartInlineEdit
        value={sow.title}
        type="text"
        entity="sow_tasks"
        field="title"
        aria-label="Judul SOW"
        validate={(v) => !String(v).trim() ? 'Judul tidak boleh kosong' : null}
        baseRow={sow}
        onConflict={handleConflict({
          table: 'sow_tasks',
          rowLabel: sow.title,
          baseRow: sow as unknown as Parameters<typeof handleConflict>[0]['baseRow'],
          save: (values) => save.patch({ id: sow.id, values }),
        })}
        onSave={(newTitle) => save.patch({ id: sow.id, values: { title: newTitle } })}
        className="hover:underline cursor-pointer"
      />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
        className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-500)] underline-offset-2 hover:underline"
        aria-label="Lihat detail SOW"
      >
        Detail
      </button>
      <DetailSheet
        table="sow_tasks"
        rowId={sow.id}
        data={sow}
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        onSaved={save.invalidate}
        onDeleted={save.invalidate}
      />
    </div>
  )
}
