// src/app/(dashboard)/owner/layout.tsx
// Role guard for /owner/* pages.
// Allowed: owner only — Kepala Kantor uses /kepala-kantor/*, PIC uses /divisi/*,
// Staff uses /personal/*.

import { ReactNode } from 'react'
import { requireExactRole } from '@/lib/auth/role-guard'

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  await requireExactRole(['owner'])
  return <>{children}</>
}
