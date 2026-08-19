// app/page.tsx
// Main page - redirects to appropriate dashboard based on role

import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

// Always run server-side per request — Supabase client requires runtime env.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getServerSession()
  
  if (!session?.user) {
    redirect('/login')
  }

  // Redirect based on role
  const { role } = session.user
  
  switch (role) {
    case 'owner':
      redirect('/owner')
    case 'kepala_kantor':
      redirect('/kepala-kantor')
    case 'pic_divisi':
      redirect(`/divisi/${session.user.divisionId}`)
    case 'staff':
      redirect('/personal')
    default:
      redirect('/personal')
  }
}