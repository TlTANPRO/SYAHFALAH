// app/forbidden/page.tsx
// Phase 1 Item 8 — Strict 403 page.
// Replaces silent redirect to /personal/tasks with explicit forbidden
// surface. Reads ?reason= query to tailor message.

import { ShieldOff, ArrowLeft, Home } from 'lucide-react'
import Link from 'next/link'
import { readSession } from '@/lib/auth/role-guard'
import { Card, CardContent } from '@/components/ui/card'

interface PageProps {
  searchParams: Promise<{ reason?: string; from?: string }>
}

const REASON_LABEL: Record<string, string> = {
  role: 'Role Anda tidak punya akses ke halaman ini.',
  division: 'Anda hanya boleh mengakses divisi Anda sendiri.',
  unknown: 'Akses ditolak.',
}

export default async function ForbiddenPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const session = await readSession()
  const reason = REASON_LABEL[sp.reason ?? 'unknown'] ?? REASON_LABEL.unknown

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-surface-1)]">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <ShieldOff className="h-12 w-12 mx-auto mb-4 text-amber-500" aria-hidden="true" />

          <h1 className="text-2xl font-heading font-bold mb-2">403 — Akses Ditolak</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">{reason}</p>
          {sp.from && (
            <p className="text-xs text-[var(--color-text-tertiary)] font-mono mb-6">
              Asal: {sp.from}
            </p>
          )}
          {!sp.from && <div className="mb-6" />}

          {session ? (
            <div className="space-y-3">
              <div className="text-xs text-[var(--color-text-tertiary)]">
                Login sebagai <strong>{session.name ?? session.email ?? 'user'}</strong> · role {session.role}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href="/personal/tasks"
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-[var(--color-brand-500)] text-white text-sm font-medium hover:bg-[var(--color-brand-600)] transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Tasks saya
                </Link>
                <button
                  type="button"
                  onClick={typeof window !== 'undefined' ? () => window.history.back() : undefined}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-primary)] text-sm font-medium hover:bg-[var(--color-surface-3)] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-[var(--color-brand-500)] text-white text-sm font-medium hover:bg-[var(--color-brand-600)] transition-colors"
            >
              Login
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
