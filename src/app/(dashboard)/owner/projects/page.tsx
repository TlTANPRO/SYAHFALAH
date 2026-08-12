// app/(dashboard)/owner/projects/page.tsx
// Plan C Phase 2 — Project Management overview.
// Tabs: projects / blocks / house_units. Each shows list + create form.

import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { Building2, Plus } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProjectCreateForm } from './ProjectCreateForm'
import { BlockCreateForm } from './BlockCreateForm'
import { HouseUnitCreateForm } from './HouseUnitCreateForm'
import { HeroSection } from '@/components/layout/HeroSection'
import { EmptyState } from '@/components/ui/empty-state'
import { ProjectRowClient } from './ProjectRowClient'
import { ProjectsMobileView } from './ProjectsMobileView'

type Tab = 'projects' | 'blocks' | 'house_units'
const TABS: readonly Tab[] = ['projects', 'blocks', 'house_units'] as const
const TAB_LABEL: Record<Tab, string> = { projects: 'Projects', blocks: 'Blocks', house_units: 'House Units' }

// PUSH #1: ISR caching - project data is stable (changes on project/cluster/block updates)
// Combined with mutation-time invalidation in crud-handler, mutating any project
// invalidates this page's cache automatically via revalidateTag.
export const revalidate = 120

interface PageProps { searchParams: Promise<{ tab?: string; cabang?: string }> }

const getCachedCounts = unstable_cache(
  async () => {
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
  },
  ['owner-projects-counts'],
  { revalidate: 60, tags: ['projects'] }
)

async function loadCounts() {
  return getCachedCounts()
}

const getCachedTab = unstable_cache(
  async (tab: string, cabangId: string | null) => {
    return _loadTabInternal(tab as Tab, cabangId)
  },
  ['owner-projects-tab'],
  { revalidate: 30, tags: ['projects'] }
)

async function loadTab(tab: Tab, cabangId: string | null = null) {
  return getCachedTab(tab, cabangId)
}

async function _loadTabInternal(tab: Tab, cabangId: string | null = null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  if (tab === 'projects') {
    let q = supabase.from('projects').select('id, code, name, cluster_id, cabang_id, total_units, units_completed, start_date, target_completion_date, budget_rupiah, spent_rupiah, status, project_manager_id, created_at')
    if (cabangId) q = q.eq('cabang_id', cabangId)
    const { data } = await q.order('created_at', { ascending: false }).limit(50)
    return data ?? []
  }
  if (tab === 'blocks') {
    // For blocks, filter via project.cabang_id — pull project ids in this cabang first.
    let projectIds: string[] | null = null
    if (cabangId) {
      const { data: projs } = await supabase.from('projects').select('id').eq('cabang_id', cabangId)
      projectIds = (projs ?? []).map(p => p.id)
      if (projectIds.length === 0) return []
    }
    let q = supabase.from('blocks').select('id, project_id, name, code, total_units, description, sort_order, created_at')
    if (projectIds) q = q.in('project_id', projectIds)
    const { data } = await q.order('sort_order', { ascending: true }).limit(50)
    return data ?? []
  }
  // house_units — filter via blocks of projects in this cabang
  if (cabangId) {
    const { data: projs } = await supabase.from('projects').select('id').eq('cabang_id', cabangId)
    const projectIds = (projs ?? []).map(p => p.id)
    if (projectIds.length === 0) return []
    const { data: blks } = await supabase.from('blocks').select('id').in('project_id', projectIds)
    const blockIds = (blks ?? []).map(b => b.id)
    if (blockIds.length === 0) return []
    const { data } = await supabase.from('house_units').select('id, block_id, unit_number, type, size_m2, price_rupiah, status, customer_id, notes, created_at, updated_at').in('block_id', blockIds).order('created_at', { ascending: false }).limit(50)
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
  if (!url || !key) return { clusters: [], projects: [], blocks: [], cabangs: [] }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [c, p, b, cg] = await Promise.all([
    supabase.from('clusters').select('id, code, name').eq('is_active', true).order('code'),
    supabase.from('projects').select('id, code, name').order('code'),
    supabase.from('blocks').select('id, name, project_id').order('name'),
    supabase.from('cabangs').select('id, code, name').eq('is_active', true).order('code'),
  ])
  return {
    clusters: c.data ?? [],
    projects: p.data ?? [],
    blocks: b.data ?? [],
    cabangs: cg.data ?? [],
  }
}

async function loadCabangCounts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return new Map<string, number>()
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  // Group by cabang via HEAD count is expensive; use a single select of (cabang_id) and
  // count in-memory. With 15 projects this is fine.
  const { data } = await supabase.from('projects').select('cabang_id')
  const m = new Map<string, number>()
  for (const r of data ?? []) {
    const k = (r as any).cabang_id ?? ''
    if (k) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
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
  // Validate UUID-ish (cabang is uuid).
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const cabangId: string | null = sp.cabang && UUID_RE.test(sp.cabang) ? sp.cabang : null
  const [counts, rows, aux, cabangCounts] = await Promise.all([
    loadCounts(), loadTab(activeTab, cabangId), loadAux(), loadCabangCounts(),
  ])
  const activeCabang = aux.cabangs.find(c => c.id === cabangId)

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: 'Owner', href: '/owner' }, { label: 'Project Management' }]} />

      <HeroSection
        eyebrow={<><Building2 className="inline h-3 w-3 mr-1" aria-hidden /> Project Management</>}
        title={<h1 className="display-lg">Project Management</h1>}
        subtitle="Cluster → Project → Block → House Unit."
        pills={
          activeCabang ? (
            <span className="pill" data-variant="brand">
              Filtered · {activeCabang.name}
            </span>
          ) : (
            <span className="pill" data-variant="brand">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)]" aria-hidden />
              Live · realtime
            </span>
          )
        }
      />

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
            <TabsTrigger key={t} value={t} active={activeTab === t} href={`/owner/projects?tab=${t}${cabangId ? `&cabang=${cabangId}` : ''}`}>
              {TAB_LABEL[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent active>
          {/* Cabang filter — Plan C Phase 4 stub finish. Pill-shaped chips with counts.
              Selecting "Semua cabang" clears the filter; selecting a specific cabang
              scopes projects/blocks/house_units to that branch. */}
          {aux.cabangs.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter cabang">
              <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mr-1">Cabang:</span>
              <a
                href={`/owner/projects?tab=${activeTab}`}
                className={`pill ${cabangId ? '' : 'bg-[var(--color-brand-500)] text-white'}`}
                data-variant={cabangId ? 'outline' : 'brand'}
                aria-current={!cabangId ? "page" : "false"}
              >
                Semua ({cabangCounts ? Array.from(cabangCounts.values()).reduce((a, b) => a + b, 0) : counts?.projects ?? 0})
              </a>
              {aux.cabangs.map(c => {
                const isActive = c.id === cabangId
                return (
                  <a
                    key={c.id}
                    href={`/owner/projects?tab=${activeTab}&cabang=${c.id}`}
                    className={`pill ${isActive ? 'bg-[var(--color-brand-500)] text-white' : ''}`}
                    data-variant={isActive ? 'brand' : 'outline'}
                    aria-current={isActive}
                  >
                    {c.code} ({cabangCounts.get(c.id) ?? 0})
                  </a>
                )
              })}
              {activeCabang && (
                <span className="text-xs text-[var(--color-text-tertiary)] ml-2">
                  Filter aktif: <strong>{activeCabang.name}</strong>
                </span>
              )}
            </div>
          )}

          {activeTab === 'projects' && <ProjectCreateForm clusters={aux.clusters} />}
          {activeTab === 'blocks' && <BlockCreateForm projects={aux.projects} />}
          {activeTab === 'house_units' && <HouseUnitCreateForm blocks={aux.blocks} />}

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">{TAB_LABEL[activeTab]} ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  variant={(cabangId) ? 'search-empty' : 'no-data'}
                  eyebrow={TAB_LABEL[activeTab]}
                  title={
                    cabangId
                      ? `Tidak ada ${TAB_LABEL[activeTab].toLowerCase()} di cabang ${activeCabang?.name ?? 'ini'}`
                      : `Belum ada ${TAB_LABEL[activeTab].toLowerCase()}`
                  }
                  description={
                    cabangId
                      ? 'Coba ganti cabang atau reset filter.'
                      : 'Tambahkan entri pertama dengan form di atas.'
                  }
                  action={
                    !cabangId
                      ? undefined
                      : { label: 'Reset filter', href: `/owner/projects?tab=${activeTab}` }
                  }
                />
              ) : (
                <>
                  {activeTab === 'projects' && (
                    <ProjectsMobileView rows={rows as any} />
                  )}
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
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProjectRow({ r }: { r: any }) {
  // Find the cabang name from the lookup provided by parent scope (closure not available
  // in this fn; render code if we have it, else just a hint). The list isn't aware of
  // the aux lookup here, so just show a generic placeholder if the backend didn't join it.
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <ProjectRowClient row={r} />
        {r.code && <Badge variant="outline">{r.code}</Badge>}
        {r.cabang_id && (
          <Badge variant="info" className="text-xs" title="Cabang proyek">
            CBG
          </Badge>
        )}
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
        <ProjectRowClient row={r} />
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
