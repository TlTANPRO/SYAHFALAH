// app/error.tsx
// Root-level error boundary so a runtime crash in one page doesn't take
// down the entire dashboard. Surfaces a retry button instead of a blank page.
//
// NOTE: this file MUST be a Client Component ('use client') because `reset`
// is a function passed in by Next.js that only exists on the client. We also
// avoid <Button asChild> here because the Slot/forwardRef combination fails
// during static prerendering of certain pages — styled anchors work fine.

'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <CardContent className="pt-12 pb-10 px-8 text-center">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-destructive/10 mb-6">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight mb-3">
            Terjadi Kesalahan
          </h1>
          <p className="text-muted-foreground text-sm mb-2 max-w-sm mx-auto">
            Dashboard gagal memuat. Coba muat ulang, atau kembali ke beranda.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60 mb-6 font-mono">
              ref: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </Button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <Home className="h-4 w-4" />
              Ke Beranda
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}