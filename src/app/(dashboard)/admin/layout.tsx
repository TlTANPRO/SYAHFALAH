// src/app/(dashboard)/admin/layout.tsx
// Admin panel — owner only. Strict; Kepala Kantor does not get staff/user mgmt.

import { ReactNode } from 'react'
import { requireExactRole } from '@/lib/auth/role-guard'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireExactRole(['owner'])
  return <>{children}</>
}
