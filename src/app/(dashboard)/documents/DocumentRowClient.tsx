// app/(dashboard)/documents/DocumentRowClient.tsx
'use client'
import * as React from 'react'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { useRowSave } from '@/hooks/useRowSave'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

export function DocumentRowClient({ doc }: { doc: any }) {
  const [open, setOpen] = React.useState(false)
  const save = useRowSave({ queryKey: 'documents' })
  const { handleConflict } = useConflictResolver()

  return (
    <div className="flex items-center gap-2">
      <SmartInlineEdit
        value={doc.title}
        type="text"
        entity="documents"
        field="title"
        aria-label="Judul dokumen"
        validate={(v) => !String(v).trim() ? 'Judul tidak boleh kosong' : null}
        baseRow={doc}
        onConflict={handleConflict({
          table: 'documents',
          rowLabel: doc.title,
          baseRow: doc as unknown as Parameters<typeof handleConflict>[0]['baseRow'],
          save: (values) => save.patch({ id: doc.id, values }),
        })}
        onSave={(newTitle) => save.patch({ id: doc.id, values: { title: newTitle } })}
        className="hover:underline"
      />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-500)] underline-offset-2 hover:underline"
        aria-label="Lihat detail dokumen"
      >
        Edit
      </button>
      <DetailSheet
        table="documents"
        rowId={doc.id}
        data={doc}
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        onSaved={save.invalidate}
        onDeleted={save.invalidate}
      />
    </div>
  )
}
