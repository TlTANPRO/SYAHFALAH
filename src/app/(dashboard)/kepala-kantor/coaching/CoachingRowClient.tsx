// app/(dashboard)/kepala-kantor/coaching/CoachingRowClient.tsx
'use client'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { useRowSave } from '@/hooks/useRowSave'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

interface Props {
  taskId: string
  title: string
}

export function CoachingRowClient({ taskId, title }: Props) {
  const save = useRowSave({ queryKey: 'coaching' })
  const { handleConflict } = useConflictResolver()

  return (
    <SmartInlineEdit
      value={title}
      type="text"
      entity="tasks"
      field="title"
      aria-label="Edit judul coaching"
      validate={(v) => !String(v).trim() ? 'Judul tidak boleh kosong' : null}
      baseRow={{ id: taskId, title }}
      onConflict={handleConflict({
        table: 'tasks',
        rowLabel: title,
        baseRow: { id: taskId, title } as unknown as Parameters<typeof handleConflict>[0]['baseRow'],
        save: (values) => save.patch({ id: taskId, values }),
      })}
      onSave={(newTitle) => save.patch({ id: taskId, values: { title: newTitle } })}
      className="font-medium hover:underline cursor-pointer"
    />
  )
}
