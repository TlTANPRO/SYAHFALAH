// app/(dashboard)/owner/projects/page.tsx
// Plan C Phase 2 — Project Management overview.
// Tabs: projects / blocks / house_units. Each shows list + create form.

import { createClient } from '@supabase/supabase-js'
import { Building2, Plus } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProjectCreateForm } from './ProjectCreateForm'
import { BlockCreateForm } from './BlockCreateForm'
import { HouseUnitCreateForm } from './HouseUnitCreateForm'

type Tab = 'projects' | 'blocks' | 'house_units'
const TABS: readonly Tab[] = ['projects', 'blocks', 'house_units'] as const
const TAB_LABEL: Record<Tab, string> = { projects: 'Projects', blocks: 'Blocks', house_units: 'House Units' }

interface PageProps { searchParams: Promise<{ tab?: string }> }

async function loadCounts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [p, b, h] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('blocks').select('id', { count: 'exact', head: true }),
    supabase.from('house_units').select('id', { count: 'exact', head: true }),
  ])
  return { projects: p.count ?? 0, blocks: b.count ?? 0, house_units: h.count ?? 0 }
}

async function loadTab(tab: Tab) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  if (tab === 'projects') {
    const { data } = await supabase
      .from('projects')
      .select('id, code, name, cluster_id, total_units, units_completed, start_date, target_completion_date, budget_rupiah, spent_rupiah, status, project_manager_id, created_at')
      .order('created_at', { ascending: false }).limit(50)
    return data ?? []
  }
  if (tab === 'blocks') {
    const { data } = await supabase
      .from('blocks')
      .select('id, project_id, name, code, total_units, description, sort_order, created_at')
      .order('sort_order', { ascending: true }).limit(50)
    return data ?? []
  }
  const { data } = await supabase
    .from('house_units')
    .select('id, block_id, unit_number, type, size_m2, price_rupiah, status, customer_id, notes, created_at, updated_at')
    .order('created_at', { ascending: false }).limit(50)
  return data ?? []
}

async function loadAux() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { clusters: [], projects: [], blocks: [] }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [c, p, b] = await Promise.all([
    supabase.from('clusters').select('id, code, name').eq('is_active', true).order('code'),
    supabase.from('projects').select('id, code, name').order('code'),
    supabase.from('blocks').select('id, name, project_id').order('name'),
  ])
  return {
    clusters: c.data ?? [],
    projects: p.data ?? [],
    blocks: b.data ?? [],
  }
}

function fmtRp(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function fmtPct(a: number | null, b: number | null): string {
  if (a == null || b == null || b === 0) return '—'
  return `${Math.round((a / b) * 100)}%`
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const activeTab: Tab = (TABS as readonly string[]).includes(sp.tab ?? '') ? (sp.tab as Tab) : 'projects'
  const [counts, rows, aux] = await Promise.all([loadCounts(), loadTab(activeTab), loadAux()])

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: 'Owner', href: '/owner' }, { label: 'Project Management' }]} />

      <div>
        <h1 className="display-lg flex items-center gap-2">
          <Building2 className="h-6 w-6 text-[var(--color-brand-500)]" />
          Project Management
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Cluster → Project → Block → House Unit. Phase 2 (migration 017).
        </p>
      </div>

      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(Object.keys(counts) as Tab[]).map(k => (
            <div key={k} className="card">
              <div className="card-body">
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
                  {TAB_LABEL[k]}
                </p>
                <p className="mt-2 text-3xl font-heading font-bold tabular-nums">{counts[k]}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Tabs>
        <TabsList>
          {TABS.map(t => (
            <TabsTrigger key={t} value={t} active={activeTab === t} href={`/owner/projects?tab=${t}`}>
              {TAB_LABEL[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent active>
          {activeTab === 'projects' && <ProjectCreateForm clusters={aux.clusters} />}
          {activeTab === 'blocks' && <BlockCreateForm projects={aux.projects} />}
          {activeTab === 'house_units' && <HouseUnitCreateForm blocks={aux.blocks} />}

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">{TAB_LABEL[activeTab]} ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">Belum ada data.</p>
              ) : (
                <ul className="divide-y divide-[var(--color-border-subtle)]">
                  {rows.map((r: any) => (
                    <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        {activeTab === 'projects' && <ProjectRow r={r} />}
                        {activeTab === 'blocks' && <BlockRow r={r} />}
                        {activeTab === 'house_units' && <HouseUnitRow r={r} />}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProjectRow({ r }: { r: any }) {
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-medium">{r.name}</p>
        {r.code && <Badge variant="outline">{r.code}</Badge>}
        <Badge variant={r.status === 'completed' ? 'success' : r.status === 'in_progress' ? 'info' : 'warning'}>
          {r.status}
        </Badge>
      </div>
      <div className="text-xs text-[var(--color-text-secondary)] mt-1 grid grid-cols-2 md:grid-cols-4 gap-1">
        <span>Units: <strong>{r.units_completed}</strong> / {r.total_units}</span>
        <span>Progress: <strong>{fmtPct(r.units_completed, r.total_units)}</strong></span>
        <span>Budget: {fmtRp(r.budget_rupiah)}</span>
        <span>Spent: {fmtRp(r.spent_rupiah)}</span>
      </div>
    </>
  )
}

function BlockRow({ r }: { r: any }) {
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-medium">{r.name}</p>
        {r.code && <Badge variant="outline">{r.code}</Badge>}
        <Badge variant="info">{r.total_units} units</Badge>
      </div>
      {r.description && <p className="text-xs text-[var(--color-text-secondary)] mt-1">{r.description}</p>}
    </>
  )
}

function HouseUnitRow({ r }: { r: any }) {
  const variant = r.status === 'sold' ? 'success'
    : r.status === 'booked' ? 'warning'
    : r.status === 'handed_over' ? 'info'
    : 'default'
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-medium">{r.unit_number}</p>
        {r.type && <Badge variant="outline">{r.type}</Badge>}
        <Badge variant={variant as any}>{r.status}</Badge>
        {r.size_m2 != null && <span className="text-xs text-[var(--color-text-tertiary)]">{r.size_m2} m²</span>}
        {r.price_rupiah != null && r.price_rupiah > 0 && (
          <span className="text-xs text-[var(--color-text-tertiary)]">{fmtRp(r.price_rupiah)}</span>
        )}
      </div>
    </>
  )
}
