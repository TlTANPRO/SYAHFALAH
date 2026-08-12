// app/(dashboard)/owner/reports/ReportsRowClient.tsx
'use client'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { useRowSave } from '@/hooks/useRowSave'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

interface Props {
  division: {
    id: string
    name: string
    description: string | null
    created_at: string
  }
}

export function ReportsRowClient({ division }: Props) {
  // PATCH /api/divisions/<id> + invalidate ['owner-reports'].
  const save = useRowSave({ queryKey: ['owner-reports', 'divisions'], endpoint: 'divisions' })
  const { handleConflict } = useConflictResolver()

  return (
    <div className="flex items-center gap-2 w-full">
      <h3 className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-500)]">
        <SmartInlineEdit
          value={division.name}
          type="text"
          entity="divisions"
          field="name"
          aria-label="Edit nama divisi"
          validate={(v) => !String(v).trim() ? 'Nama divisi tidak boleh kosong' : null}
          baseRow={division}
          onConflict={handleConflict({
            table: 'divisions',
            rowLabel: division.name,
            baseRow: division as unknown as Parameters<typeof handleConflict>[0]['baseRow'],
            save: (values) => save.patch({ id: division.id, values }),
          })}
          onSave={(newName) => save.patch({ id: division.id, values: { name: newName } })}
          className="font-medium"
        />
      </h3>
    </div>
  )
}
