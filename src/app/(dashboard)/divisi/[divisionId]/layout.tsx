// src/app/(dashboard)/divisi/[divisionId]/layout.tsx
// Per-division access control:
//   owner + kepala_kantor → can view any division
//   pic_divisi → only their assigned division (session.divisionId must match)
//   staff → bounced to /personal/tasks
//
// Reads [divisionId] from params (Next.js 15: params is a Promise).

import { ReactNode } from 'react'
import { requireDivisionAccess } from '@/lib/auth/role-guard'

export default async function DivisionLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ divisionId: string }>
}) {
  const { divisionId } = await params
  await requireDivisionAccess(divisionId)
  return <>{children}</>
}
