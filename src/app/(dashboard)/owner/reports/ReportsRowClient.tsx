// app/(dashboard)/owner/reports/ReportsRowClient.tsx
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { SmartInlineEdit } from '@/components/ui/smart-inline-edit'
import { useQueryClient } from '@tanstack/react-query'
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
  const router = useRouter()
  const queryClient = useQueryClient()
  const { handleConflict } = useConflictResolver()

  const handleSave = async (field: string, value: string | number) => {
    const resp = await fetch(`/api/divisions/${division.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (!resp.ok) throw new Error('Gagal menyimpan')
    queryClient.invalidateQueries({ queryKey: ['owner-reports'] })
    router.refresh()
  }

  const handleConflictSave = async (values: Record<string, unknown>) => {
    const resp = await fetch(`/api/divisions/${division.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!resp.ok) throw new Error('Gagal menyimpan')
    queryClient.invalidateQueries({ queryKey: ['owner-reports'] })
    router.refresh()
  }

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
            save: handleConflictSave,
          })}
          onSave={async (newName) => handleSave('name', newName)}
          className="font-medium"
        />
      </h3>
    </div>
  )
}
