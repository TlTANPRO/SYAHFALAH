// app/(dashboard)/owner/approvals/ApprovalsRowClient.tsx
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { useQueryClient } from '@tanstack/react-query'
import { useConflictResolver } from '@/hooks/use-conflict-resolver'

export function ApprovalsRowClient({ approval }: { approval: any }) {
  const router = useRouter()
  const queryClient = useQueryClient()
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
        save: async (values) => {
          await fetch(`/api/approvals/${approval.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          })
          queryClient.invalidateQueries({ queryKey: ['approvals'] })
          router.refresh()
        },
      })}
      onSave={async (newTitle) => {
        await fetch(`/api/approvals/${approval.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle }),
        })
        queryClient.invalidateQueries({ queryKey: ['approvals'] })
        router.refresh()
      }}
      className="text-sm font-medium hover:underline cursor-pointer"
    />
  )
}
