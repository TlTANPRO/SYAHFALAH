// app/not-found.tsx
// Branded 404 page — falls back gracefully when users hit missing routes
// (very common since the sidebar has many links to not-yet-implemented pages).

import Link from 'next/link'
import { ArrowLeft, Home, Compass } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-0)] p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <CardContent className="pt-12 pb-10 px-8 text-center">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-[var(--color-brand-500)]/10 mb-6">
            <Compass className="h-12 w-12 text-[var(--color-brand-500)]" />
                      </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight mb-3">
            404
          </h1>
          <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Halaman tidak ditemukan
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm mb-8 max-w-sm mx-auto">
            Halaman yang kamu cari belum ada atau sudah dipindahkan. Cek URL,
            atau kembali ke dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Plain anchor styled as a button — avoids <Button asChild>
                Slot/forwardRef conflicts during static prerendering. */}
            <a
              href="javascript:history.back()"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-transparent px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-2)]/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </a>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-500)] text-[var(--color-text-inverse)] px-4 py-2 text-sm font-medium shadow-xs hover:bg-[var(--color-brand-500)]/90 transition-colors"
            >
              <Home className="h-4 w-4" />
              Ke Dashboard
            </Link>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-8">
            Syahfalah Dashboard · PT Syahfalah Global
          </p>
        </CardContent>
      </Card>
    </div>
  )
}