// app/(dashboard)/kepala-kantor/coaching/CoachingRowClient.tsx
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { useQueryClient } from '@tanstack/react-query'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

interface Props {
  taskId: string
  title: string
}

export function CoachingRowClient({ taskId, title }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
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
        save: async (values) => {
          await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          })
          queryClient.invalidateQueries({ queryKey: ['coaching'] })
          router.refresh()
        },
      })}
      onSave={async (newTitle) => {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle }),
        })
        queryClient.invalidateQueries({ queryKey: ['coaching'] })
        router.refresh()
      }}
      className="font-medium hover:underline cursor-pointer"
    />
  )
}
