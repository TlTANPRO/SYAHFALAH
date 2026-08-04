// components/layout/FeatureRoadmap.tsx
// Honest page for features that aren't built yet. Lists what the page
// will do, the data source it will use, and a CTA to request priority
// bumps. No fluffy "Coming soon" — users see spec, not promises.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Construction, Database, ListChecks, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface FeatureRoadmapProps {
  title: string
  description: string
  features: string[]
  dataSource?: string
  related?: { label: string; href: string }[]
}

export function FeatureRoadmap({ title, description, features, dataSource, related }: FeatureRoadmapProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-4 w-4 text-warning" />
            <span>Rencana Fitur</span>
            <Badge variant="warning">dalam pengembangan</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <ListChecks className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Modul ini akan menyediakan:</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {dataSource && (
            <div className="flex items-start gap-3 pt-3 border-t border-border">
              <Database className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Sumber data</p>
                <p className="text-sm text-muted-foreground font-mono">{dataSource}</p>
              </div>
            </div>
          )}

          {related && related.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-sm font-medium mb-2">Modul terkait yang sudah aktif</p>
              <div className="flex flex-wrap gap-2">
                {related.map(r => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
                  >
                    {r.label}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

