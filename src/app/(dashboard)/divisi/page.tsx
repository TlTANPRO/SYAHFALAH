// app/(dashboard)/divisi/page.tsx
// Division hub. PIC Divisi users land here when they don't have a
// specific division context (e.g. coming from the sidebar root). The
// hub shows a list of divisions they can dive into. Without a known
// division we render a friendly picker.

import Link from 'next/link'
import { ChevronRight, Building2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'

type Division = { id: string; name: string; description: string | null }

export default async function DivisiHubPage() {
  const supabase = await createClient()

  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name, description')
    .order('name')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Divisi</h1>
        <p className="text-[var(--color-text-secondary)]">Pilih divisi untuk melihat KPI, tim, dan tasks</p>
      </div>

      {!divisions || divisions.length === 0 ? (
        <EmptyState
        title="Belum ada divisi"
        description="Tambahkan divisi di menu Admin > Divisi untuk mulai mengelompokkan tim dan KPI."
      />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {divisions.map((d: Division) => (
            <Link key={d.id} href={`/divisi/${d.id}`}>
              <Card className="h-full hover:border-primary/40 hover:bg-[var(--color-surface-2)]/30 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Building2 className="h-6 w-6 text-primary" />
                    <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  </div>
                  <CardTitle className="mt-3">{d.name}</CardTitle>
                  {d.description && <CardDescription>{d.description}</CardDescription>}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
