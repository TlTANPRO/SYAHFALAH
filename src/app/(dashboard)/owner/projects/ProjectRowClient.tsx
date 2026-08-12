// app/(dashboard)/owner/projects/ProjectRowClient.tsx
'use client'
import * as React from 'react'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { useRowSave } from '@/hooks/useRowSave'
import { useUndoToast } from '@/hooks/use-undo-toast'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

export function ProjectRowClient({ row }: { row: any }) {
  const [open, setOpen] = React.useState(false)
  const save = useRowSave({ queryKey: 'projects' })
  const showUndoToast = useUndoToast()
  const { handleConflict } = useConflictResolver()

  return (
    <>
      <SmartInlineEdit
        value={row.name}
        type="text"
        entity="projects"
        field="name"
        aria-label="Nama project"
        validate={(v) => !String(v).trim() ? 'Nama project tidak boleh kosong' : null}
        onUndo={(oldName, newName) => {
          showUndoToast({
            title: 'Nama project diperbarui',
            message: `${oldName} → ${newName}`,
            onUndo: () => save.patch({ id: row.id, values: { name: oldName } }),
          })
        }}
        baseRow={row}
        onConflict={handleConflict({
          table: 'projects',
          rowLabel: row.name,
          baseRow: row,
          save: (values) => save.patch({ id: row.id, values }),
        })}
        onSave={(newName) => save.patch({ id: row.id, values: { name: newName } })}
        className="hover:underline cursor-pointer"
      />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-500)] underline-offset-2 hover:underline"
        aria-label="Lihat detail project"
      >
        Detail
      </button>
      <DetailSheet
        table="projects"
        rowId={row.id}
        data={row}
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        onSaved={save.invalidate}
        onDeleted={save.invalidate}
      />
    </>
  )
}
