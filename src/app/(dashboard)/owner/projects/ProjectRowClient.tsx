// app/(dashboard)/owner/projects/ProjectRowClient.tsx
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { useQueryClient } from '@tanstack/react-query'
import { useUndoToast } from '@/hooks/use-undo-toast'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

export function ProjectRowClient({ row }: { row: any }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
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
            onUndo: async () => {
              await fetch(`/api/projects/projects/${row.id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: oldName }),
              })
              queryClient.invalidateQueries({ queryKey: ['projects'] })
              router.refresh()
            },
          })
        }}
        baseRow={row}
        onConflict={handleConflict({
          table: 'projects',
          rowLabel: row.name,
          baseRow: row,
          save: async (values) => {
            await fetch(`/api/projects/projects/${row.id}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            })
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            router.refresh()
          },
        })}
        onSave={async (newName) => {
          await fetch(`/api/projects/projects/${row.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
          })
          queryClient.invalidateQueries({ queryKey: ['projects'] })
          router.refresh()
        }}
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
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['projects'] })
          router.refresh()
        }}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ['projects'] })
          router.refresh()
        }}
      />
    </>
  )
}
