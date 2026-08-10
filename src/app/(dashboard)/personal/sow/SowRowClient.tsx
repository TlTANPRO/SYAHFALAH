// app/(dashboard)/personal/sow/SowRowClient.tsx
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { useQueryClient } from '@tanstack/react-query'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

export function SowRowClient({ sow }: { sow: any }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
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
          save: async (values) => {
            await fetch(`/api/sow-tasks/${sow.id}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            })
            queryClient.invalidateQueries({ queryKey: ['sow'] })
            router.refresh()
          },
        })}
        onSave={async (newTitle) => {
          await fetch(`/api/sow-tasks/${sow.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle }),
          })
          queryClient.invalidateQueries({ queryKey: ['sow'] })
          router.refresh()
        }}
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
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['sow'] })
          router.refresh()
        }}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ['sow'] })
          router.refresh()
        }}
      />
    </div>
  )
}
