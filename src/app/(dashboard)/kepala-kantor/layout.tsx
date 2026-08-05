// src/app/(dashboard)/kepala-kantor/layout.tsx
// Allowed: kepala_kantor, owner. Staff & PICs are redirected to their dashboards.

import { ReactNode } from 'react'
import { requireRole } from '@/lib/auth/role-guard'

export default async function KepalaKantorLayout({ children }: { children: ReactNode }) {
  // kepala_kantor (level 3) and owner (level 4) pass `hasRoleAtLeast('kepala_kantor')`.
  await requireRole('kepala_kantor')
  return <>{children}</>
}
