// app/(dashboard)/placeholder/page.tsx
// Reusable placeholder page used by stub routes whose real implementation
// is not yet built. Keeps the sidebar navigable without 404-ing.

import Link from 'next/link'
import { Construction, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface PlaceholderProps {
  title: string
  description?: string
  backHref?: string
}

export function Placeholder({ title, description, backHref = '/' }: PlaceholderProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-16 px-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-warning/10 mb-6">
            <Construction className="h-8 w-8 text-warning" />
          </div>
          <h2 className="font-heading text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {description ?? 'Modul ini sedang dalam pengembangan. Cek kembali nanti atau lihat modul lain yang sudah tersedia.'}
          </p>
          <Button asChild variant="outline" className="gap-2">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}