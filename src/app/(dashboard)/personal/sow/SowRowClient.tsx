// app/(dashboard)/personal/sow/SowRowClient.tsx
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { InlineEdit } from '@/components/ui/inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { useQueryClient } from '@tanstack/react-query'

export function SowRowClient({ sow }: { sow: any }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <InlineEdit
        value={sow.title}
        type="text"
        aria-label="Judul SOW"
        validate={(v) => !String(v).trim() ? 'Judul tidak boleh kosong' : null}
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
