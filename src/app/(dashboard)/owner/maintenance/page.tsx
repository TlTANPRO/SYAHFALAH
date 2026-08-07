// app/(dashboard)/owner/maintenance/page.tsx
// Plan C Phase 2 — Maintenance overview.
// Tabs: tickets / logs.

import { createClient } from '@supabase/supabase-js'
import { Wrench } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ListFilters } from '@/components/ui/ListFilters'
import { TicketCreateForm } from './TicketCreateForm'

type Tab = 'tickets' | 'logs'
const TABS: readonly Tab[] = ['tickets', 'logs'] as const
const TAB_LABEL: Record<Tab, string> = { tickets: 'Tickets', logs: 'Logs' }
interface PageProps { searchParams: Promise<{ tab?: string; q?: string; priority?: string; status?: string }> }

const PRIORITY_CHIPS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high',   label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low',    label: 'Low' },
]

const STATUS_CHIPS = [
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved',    label: 'Resolved' },
  { value: 'closed',      label: 'Closed' },
  { value: 'cancelled',   label: 'Cancelled' },
]

async function loadCounts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [t, l] = await Promise.all([
    sb.from('maintenance_tickets').select('id', { count: 'exact', head: true }),
    sb.from('maintenance_logs').select('id', { count: 'exact', head: true }),
  ])
  return { tickets: t.count ?? 0, logs: l.count ?? 0 }
}

async function loadTab(tab: Tab, q: string | null = null, priority: string | null = null, status: string | null = null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  if (tab === 'tickets') {
    let r = sb.from('maintenance_tickets')
      .select('id, code, title, customer_id, house_unit_id, priority, status, category, reported_at, resolved_at, cost_rupiah')
    if (q) r = r.or(`title.ilike.%${q}%,code.ilike.%${q}%`)
    if (priority) r = r.eq('priority', priority)
    if (status)   r = r.eq('status', status)
    const { data } = await r.order('reported_at', { ascending: false }).limit(50)
    return data ?? []
  }
  let r = sb.from('maintenance_logs')
    .select('id, ticket_id, actor_id, action, from_status, to_status, message, created_at')
  if (q) r = r.ilike('message', `%${q}%`)
  const { data } = await r.order('created_at', { ascending: false }).limit(50)
  return data ?? []
}

function fmtRp(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('id-ID').format(n)
}

export default async function MaintenancePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const activeTab: Tab = (TABS as readonly string[]).includes(sp.tab ?? '') ? (sp.tab as Tab) : 'tickets'
  const q = sp.q?.trim() || null
  const priority = sp.priority || null
  const status = sp.status || null
  const [counts, rows] = await Promise.all([loadCounts(), loadTab(activeTab, q, priority, status)])

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: 'Owner', href: '/owner' }, { label: 'Maintenance' }]} />

      <div>
        <h1 className="display-lg flex items-center gap-2">
          <Wrench className="h-6 w-6 text-[var(--color-brand-500)]" />
          Maintenance
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Ticket → Status changes / comments. Phase 2 (migration 019).
        </p>
      </div>

      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
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
            <TabsTrigger key={t} value={t} active={activeTab === t} href={`/owner/maintenance?tab=${t}`}>
              {TAB_LABEL[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent active>
          <div className="mt-4">
            <ListFilters
              basePath="/owner/maintenance"
              searchPlaceholder={`Cari ${activeTab === 'tickets' ? 'ticket (judul/kode)' : 'log (message)'}…`}
              searchValue={q ?? ''}
              extraParams={{ tab: activeTab, priority: priority ?? '', status: status ?? '' }}
              chips={[
                ...(activeTab === 'tickets' ? [
                  { label: 'Semua',    value: '', active: !priority, param: 'priority' },
                  ...PRIORITY_CHIPS.map(c => ({ ...c, active: priority === c.value, param: 'priority' as const })),
                ] : []),
                ...(activeTab === 'tickets' ? [
                  { label: 'Semua status', value: '', active: !status, param: 'status' },
                  ...STATUS_CHIPS.map(c => ({ ...c, active: status === c.value, param: 'status' as const })),
                ] : []),
              ]}
            />
          </div>

          {activeTab === 'tickets' && <TicketCreateForm />}

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">
                {TAB_LABEL[activeTab]} ({rows.length})
                {(priority || status || q) ? <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">— terfilter</span> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">
                  {(priority || status || q) ? 'Tidak ada data sesuai filter.' : 'Belum ada data.'}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border-subtle)]">
                  {rows.map((r: any) => (
                    <li key={r.id} className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        {activeTab === 'tickets' && (
                          <>
                            <p className="font-medium">{r.title}</p>
                            {r.code && <Badge variant="outline">{r.code}</Badge>}
                            <Badge variant={
                              r.status === 'resolved' || r.status === 'closed' ? 'success' :
                              r.status === 'cancelled' ? 'destructive' :
                              r.status === 'in_progress' ? 'info' : 'warning'
                            }>{r.status}</Badge>
                            <Badge variant={
                              r.priority === 'urgent' ? 'destructive' :
                              r.priority === 'high' ? 'warning' :
                              r.priority === 'normal' ? 'info' : 'default'
                            }>{r.priority}</Badge>
                            {r.category && <Badge variant="outline">{r.category}</Badge>}
                            {Number(r.cost_rupiah) > 0 && <span className="text-xs">Rp {fmtRp(r.cost_rupiah)}</span>}
                          </>
                        )}
                        {activeTab === 'logs' && (
                          <>
                            <Badge variant="outline">{r.action}</Badge>
                            {r.from_status && r.to_status && (
                              <span className="text-xs">{r.from_status} → {r.to_status}</span>
                            )}
                            {r.message && <span className="text-xs text-[var(--color-text-tertiary)]">{r.message}</span>}
                          </>
                        )}
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
