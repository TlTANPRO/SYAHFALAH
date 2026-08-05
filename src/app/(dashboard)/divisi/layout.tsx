// src/app/(dashboard)/divisi/layout.tsx
// /divisi/[divisionId]/* is gated per segment via divisi/[divisionId]/layout.tsx.
// Here we only enforce: any authenticated user with role >= pic_divisi.
// Staff is redirected away by the inner per-division layout.

import { ReactNode } from 'react'
import { requireRole } from '@/lib/auth/role-guard'

export default async function DivisiLayout({ children }: { children: ReactNode }) {
  await requireRole('pic_divisi')
  return <>{children}</>
}
