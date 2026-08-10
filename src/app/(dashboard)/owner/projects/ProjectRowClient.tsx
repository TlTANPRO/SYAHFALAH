// app/(dashboard)/owner/projects/ProjectRowClient.tsx
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { InlineEdit } from '@/components/ui/inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { useQueryClient } from '@tanstack/react-query'

export function ProjectRowClient({ row }: { row: any }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  
  return (
    <>
      <InlineEdit
        value={row.name}
        type="text"
        aria-label="Nama project"
        validate={(v) => !String(v).trim() ? 'Nama project tidak boleh kosong' : null}
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
