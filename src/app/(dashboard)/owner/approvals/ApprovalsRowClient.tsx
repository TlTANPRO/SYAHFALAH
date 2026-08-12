// app/(dashboard)/owner/approvals/ApprovalsRowClient.tsx
'use client'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { useRowSave } from '@/hooks/useRowSave'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

export function ApprovalsRowClient({ approval }: { approval: any }) {
  const save = useRowSave({ queryKey: 'approvals' })
  const { handleConflict } = useConflictResolver()

  return (
    <SmartInlineEdit
      value={approval.title}
      type="text"
      entity="approvals"
      field="title"
      aria-label="Edit judul approval"
      validate={(v) => !String(v).trim() ? 'Judul tidak boleh kosong' : null}
      baseRow={approval}
      onConflict={handleConflict({
        table: 'approvals',
        rowLabel: approval.title,
        baseRow: approval as unknown as Parameters<typeof handleConflict>[0]['baseRow'],
        save: (values) => save.patch({ id: approval.id, values }),
      })}
      onSave={(newTitle) => save.patch({ id: approval.id, values: { title: newTitle } })}
      className="text-sm font-medium hover:underline cursor-pointer"
    />
  )
}
