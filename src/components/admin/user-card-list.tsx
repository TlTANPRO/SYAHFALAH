// src/components/admin/user-card-list.tsx
// Mobile-optimized card view for /admin/users.
// Shows users as cards (swipeable) on mobile, hidden on desktop.

'use client'

import * as React from 'react'
import { ChevronRight, Edit3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { InlineEdit } from '@/components/ui/inline-edit'
import { SwipeableRow } from '@/components/ui/swipeable-row'
import { cn } from '@/lib/utils'

interface User {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  role: string
  position: string | null
  division_id: string | null
  is_active: boolean
}

interface Props {
  users: User[]
  divisions: Array<{ id: string; name: string }>
  onEdit: (user: User) => void
  onSave: (userId: string, field: string, value: string | number) => Promise<void>
}

const ROLE_LABELS: Record<string, { label: string; variant: 'default' | 'info' | 'warning' | 'success' }> = {
  owner: { label: 'Owner', variant: 'default' },
  kepala_kantor: { label: 'Kepala Kantor', variant: 'info' },
  pic_divisi: { label: 'PIC Divisi', variant: 'warning' },
  staff: { label: 'Staff', variant: 'success' },
}

export function UserCardList({ users, divisions, onEdit, onSave }: Props) {
  const divName = React.useMemo(() => {
    const m = new Map<string, string>()
    divisions.forEach((d) => m.set(d.id, d.name))
    return m
  }, [divisions])

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[var(--color-text-tertiary)]">
        Tidak ada user.
      </div>
    )
  }

  return (
    <div className="sm:hidden space-y-2">
      {users.map((user) => {
        const r = ROLE_LABELS[user.role] ?? { label: user.role, variant: 'default' as const }
        return (
          <SwipeableRow
            key={user.id}
            rightAction={{
              id: 'edit',
              label: 'Edit',
              icon: Edit3,
              onTrigger: () => onEdit(user),
            }}
            className="rounded-lg overflow-hidden border border-[var(--color-border-default)]"
          >
            <button
              type="button"
              onClick={() => onEdit(user)}
              className="w-full text-left bg-[var(--color-surface-1)] p-3 space-y-2 active:bg-[var(--color-surface-2)]"
              aria-label={`Buka detail ${user.full_name}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <InlineEdit
                    value={user.full_name}
                    type="text"
                    aria-label={`Nama ${user.full_name}`}
                    validate={(v) => !String(v).trim() ? 'Nama kosong' : null}
                    onSave={async (newName) => {
                      await onSave(user.id, 'full_name', newName)
                    }}
                    className="font-medium text-[var(--color-brand-500)]"
                  />
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {user.position || '—'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)] shrink-0 mt-1" />
              </div>
              
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant={r.variant}>{r.label}</Badge>
                {user.division_id && (
                  <Badge variant="outline">
                    {divName.get(user.division_id) ?? '—'}
                  </Badge>
                )}
                <Badge variant={user.is_active ? 'success' : 'default'}>
                  {user.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>

              <div className="text-xs text-[var(--color-text-tertiary)] space-y-0.5">
                {user.email && <div className="truncate">📧 {user.email}</div>}
                {user.phone && <div>📱 {user.phone}</div>}
              </div>
            </button>
          </SwipeableRow>
        )
      })}
      <p className="text-xs text-[var(--color-text-tertiary)] text-center py-2">
        ← Geser untuk edit · Tap untuk detail →
      </p>
    </div>
  )
}
