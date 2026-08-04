// app/(dashboard)/loading.tsx
// Skeleton shown while dashboard route data loads. Without this, users see
// a blank page whenever a useQuery is fetching.

import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat dashboard">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span className="text-sm">Memuat data dashboard…</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-4 w-24 bg-muted rounded animate-pulse mb-4" />
              <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
              <div className="h-2 w-full bg-muted rounded-full animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-4 w-32 bg-muted rounded animate-pulse mb-4" />
              <div className="h-16 w-full bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <span className="sr-only">Memuat dashboard…</span>
    </div>
  )
}