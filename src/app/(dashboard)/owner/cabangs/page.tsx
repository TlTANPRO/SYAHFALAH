// app/(dashboard)/owner/cabangs/page.tsx
// Plan C Phase 4 — Multi-cabang overview page.
// Owner-only. Shows branch stats + create form (foundation; full
// branch-scoping UI is a separate sprint).

import { Building, Plus } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CabangCreateForm } from './CabangCreateForm'
import { createClient } from '@supabase/supabase-js'

interface CabangStats {
  id: string
  code: string
  name: string
  region: string | null
  address: string | null
  phone: string | null
  is_active: boolean
  manager_id: string | null
  stats: { divisions: number; clusters: number; projects: number; users: number }
}

async function load() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { cabangs: [], computedAt: new Date().toISOString() }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const [cabangs, divs, cl, proj, usrs] = await Promise.all([
    sb.from('cabangs').select('*').order('code'),
    sb.from('divisions').select('cabang_id'),
    sb.from('clusters').select('cabang_id'),
    sb.from('projects').select('cabang_id'),
    sb.from('users').select('cabang_id').eq('is_active', true),
  ])

  const list: CabangStats[] = (cabangs.data ?? []).map((c: any) => ({
    id: c.id, code: c.code, name: c.name, region: c.region, address: c.address,
    phone: c.phone, is_active: c.is_active, manager_id: c.manager_id,
    stats: {
      divisions: (divs.data ?? []).filter((d: any) => d.cabang_id === c.id).length,
      clusters: (cl.data ?? []).filter((d: any) => d.cabang_id === c.id).length,
      projects: (proj.data ?? []).filter((d: any) => d.cabang_id === c.id).length,
      users: (usrs.data ?? []).filter((d: any) => d.cabang_id === c.id).length,
    },
  }))

  return { cabangs: list, computedAt: new Date().toISOString() }
}

export default async function CabangsPage() {
  const { cabangs, computedAt } = await load()
  const active = cabangs.filter(c => c.is_active).length
  const totalUsers = cabangs.reduce((s, c) => s + c.stats.users, 0)

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: 'Owner', href: '/owner' }, { label: 'Cabangs' }]} />

      <div>
        <h1 className="display-lg flex items-center gap-2">
          <Building className="h-6 w-6 text-[var(--color-brand-500)]" />
          Multi-Cabang
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Kelola cabang dan lihat distribusi divisi, cluster, project, user per cabang.
          Phase 4 (migration 022).
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Total cabangs</p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums">{cabangs.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Cabangs aktif</p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-emerald-500">{active}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Total user aktif</p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums">{totalUsers}</p>
          </div>
        </div>
      </div>

      <CabangCreateForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Daftar cabang ({cabangs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cabangs.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">Belum ada cabang.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-subtle)]">
              {cabangs.map(c => (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{c.name}</p>
                        <Badge variant="outline">{c.code}</Badge>
                        <Badge variant={c.is_active ? 'success' : 'default'}>{c.is_active ? 'aktif' : 'nonaktif'}</Badge>
                        {c.region && <Badge variant="info">{c.region}</Badge>}
                      </div>
                      {c.address && <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{c.address}</p>}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-[10px] text-[var(--color-text-tertiary)] text-right">
                      <div>
                        <p className="font-mono text-base text-[var(--color-text-primary)]">{c.stats.users}</p>
                        <p>users</p>
                      </div>
                      <div>
                        <p className="font-mono text-base text-[var(--color-text-primary)]">{c.stats.divisions}</p>
                        <p>div</p>
                      </div>
                      <div>
                        <p className="font-mono text-base text-[var(--color-text-primary)]">{c.stats.clusters}</p>
                        <p>cluster</p>
                      </div>
                      <div>
                        <p className="font-mono text-base text-[var(--color-text-primary)]">{c.stats.projects}</p>
                        <p>proj</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-[var(--color-text-tertiary)] text-center">
        Snapshot: {computedAt}
      </p>
    </div>
  )
}
