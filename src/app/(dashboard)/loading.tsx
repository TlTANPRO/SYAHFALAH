// app/(dashboard)/loading.tsx
// Skeleton shown while dashboard route data loads. Without this, users see
// a blank page whenever a useQuery is fetching. The shimmer is built from
// the `--animate-shimmer` @theme keyframe so it matches the spec.

import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat dashboard">
      <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
        <span className="relative flex h-3 w-3">
          <span className="absolute inset-0 inline-flex h-full w-full animate-pulse-soft rounded-full bg-[var(--color-brand-500)] opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--color-brand-500)]" />
        </span>
        <span className="text-sm font-medium">Memuat data dashboard…</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="h-4 w-24 rounded bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%] animate-shimmer" />
              <div className="h-8 w-32 rounded bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%] animate-shimmer" />
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%] animate-shimmer" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="h-4 w-32 rounded bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%] animate-shimmer" />
              <div className="h-16 w-full rounded bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%] animate-shimmer" />
            </CardContent>
          </Card>
        ))}
      </div>

      <span className="sr-only">Memuat dashboard…</span>
    </div>
  )
}
