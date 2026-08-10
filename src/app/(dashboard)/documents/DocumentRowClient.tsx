// app/(dashboard)/documents/DocumentRowClient.tsx
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { InlineEdit } from '@/components/ui/inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { useQueryClient } from '@tanstack/react-query'

export function DocumentRowClient({ doc }: { doc: any }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  
  return (
    <div className="flex items-center gap-2">
      <InlineEdit
        value={doc.title}
        type="text"
        aria-label="Judul dokumen"
        validate={(v) => !String(v).trim() ? 'Judul tidak boleh kosong' : null}
        onSave={async (newTitle) => {
          await fetch(`/api/documents/${doc.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle }),
          })
          queryClient.invalidateQueries({ queryKey: ['documents'] })
          router.refresh()
        }}
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
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['documents'] })
          router.refresh()
        }}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ['documents'] })
          router.refresh()
        }}
      />
    </div>
  )
}
