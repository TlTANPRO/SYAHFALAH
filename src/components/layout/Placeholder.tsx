// components/layout/Placeholder.tsx
// Reusable placeholder page used by stub routes whose real implementation
// is not yet built. Keeps the sidebar navigable without 404-ing.
//
// NOTE: avoid <Button asChild> here — the Slot/forwardRef combination
// fails during Next.js static prerendering of these stub pages. A styled
// <Link> is simpler and works in both client and server contexts.

import Link from 'next/link'
import { Construction, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

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
          <Link
            href={backHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}