// app/(dashboard)/divisi/page.tsx
// Division hub. PIC Divisi users land here when they don't have a
// specific division context. Surface divisions as a calm grid.

import Link from 'next/link'
import { Building2, ArrowRight, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

type Division = { id: string; name: string; description: string | null }

export default async function DivisiHubPage() {
  const supabase = await createClient()
  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name, description')
    .order('name')

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: 'Divisi' }]} />

      <section className="hero">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="space-y-2">
            <p className="eyebrow eyebrow-brand">
              <Building2 className="inline h-3 w-3 mr-1" aria-hidden /> Operasional
            </p>
            <h1 className="display-lg">Divisi</h1>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
              Pilih divisi untuk melihat KPI, tim, dan tasks.
            </p>
          </div>
        </div>
      </section>

      {!divisions || divisions.length === 0 ? (
        <EmptyState
          title="Belum ada divisi"
          description="Tambahkan divisi di menu Admin > Divisi untuk mulai mengelompokkan tim dan KPI."
        />
      ) : (
        <ul className="hub-grid stagger-item list-none p-0" role="list">
          {divisions.map((d: Division) => (
            <li key={d.id}>
              <Link
                href={`/divisi/${d.id}`}
                className="hub-card group flex items-start gap-3"
                aria-label={`${d.name}${d.description ? ' — ' + d.description : ''}`}
              >
                <Building2
                  className="h-4 w-4 text-[var(--color-text-tertiary)] mt-0.5 transition-colors group-hover:text-[var(--color-brand-500)]"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {d.name}
                  </p>
                  {d.description && (
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 line-clamp-2">
                      {d.description}
                    </p>
                  )}
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] mt-1 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
