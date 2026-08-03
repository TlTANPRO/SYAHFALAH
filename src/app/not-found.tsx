// app/not-found.tsx
// Branded 404 page — falls back gracefully when users hit missing routes
// (very common since the sidebar has many links to not-yet-implemented pages).

'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Home, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <CardContent className="pt-12 pb-10 px-8 text-center">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-primary/10 mb-6">
            <Compass className="h-12 w-12 text-primary" />
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight mb-3">
            404
          </h1>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            Halaman tidak ditemukan
          </h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
            Halaman yang kamu cari belum ada atau sudah dipindahkan. Cek URL,
            atau kembali ke dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.back()} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
            <Button asChild className="gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                Ke Dashboard
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-8">
            Syahfalah Dashboard · PT Syahfalah Global
          </p>
        </CardContent>
      </Card>
    </div>
  )
}