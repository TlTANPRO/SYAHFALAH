// app/(dashboard)/owner/purchasing/page.tsx
// Plan C Phase 2 — Purchasing overview.
// Tabs: suppliers / materials / purchase_requests / purchase_orders.

import { createClient } from '@supabase/supabase-js'
import { ShoppingCart } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ListFilters } from '@/components/ui/ListFilters'
import { SupplierCreateForm } from './SupplierCreateForm'
import { MaterialCreateForm } from './MaterialCreateForm'
import { PurchaseRequestCreateForm } from './PurchaseRequestCreateForm'
import { PurchaseOrderCreateForm } from './PurchaseOrderCreateForm'

type Tab = 'suppliers' | 'materials' | 'purchase_requests' | 'purchase_orders'
const TABS: readonly Tab[] = ['suppliers', 'materials', 'purchase_requests', 'purchase_orders'] as const
const TAB_LABEL: Record<Tab, string> = {
  suppliers: 'Suppliers', materials: 'Materials',
  purchase_requests: 'Purchase Requests', purchase_orders: 'Purchase Orders',
}
interface PageProps { searchParams: Promise<{ tab?: string; q?: string; status?: string }> }

async function loadCounts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [s, m, pr, po] = await Promise.all([
    sb.from('suppliers').select('id', { count: 'exact', head: true }),
    sb.from('materials').select('id', { count: 'exact', head: true }),
    sb.from('purchase_requests').select('id', { count: 'exact', head: true }),
    sb.from('purchase_orders').select('id', { count: 'exact', head: true }),
  ])
  return { suppliers: s.count ?? 0, materials: m.count ?? 0, purchase_requests: pr.count ?? 0, purchase_orders: po.count ?? 0 }
}

async function loadTab(tab: Tab, q: string | null = null, status: string | null = null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  if (tab === 'suppliers') {
    let r = sb.from('suppliers').select('id, code, name, contact_name, phone, email, is_active, created_at')
    if (q) r = r.or(`name.ilike.%${q}%,code.ilike.%${q}%`)
    const { data } = await r.order('created_at', { ascending: false }).limit(50)
    return data ?? []
  }
  if (tab === 'materials') {
    let r = sb.from('materials').select('id, code, name, category, unit, standard_price_rupiah, is_active, created_at')
    if (q) r = r.or(`name.ilike.%${q}%,code.ilike.%${q}%,category.ilike.%${q}%`)
    const { data } = await r.order('created_at', { ascending: false }).limit(50)
    return data ?? []
  }
  if (tab === 'purchase_requests') {
    let r = sb.from('purchase_requests').select('id, code, requester_id, project_id, title, needed_by, status, created_at')
    if (q) r = r.ilike('title', `%${q}%`)
    if (status) r = r.eq('status', status)
    const { data } = await r.order('created_at', { ascending: false }).limit(50)
    return data ?? []
  }
  let r = sb.from('purchase_orders').select('id, code, supplier_id, project_id, total_rupiah, status, order_date, expected_date, received_date, created_at')
  if (q) r = r.ilike('code', `%${q}%`)
  if (status) r = r.eq('status', status)
  const { data } = await r.order('created_at', { ascending: false }).limit(50)
  return data ?? []
}

const PO_STATUS_CHIPS = [
  { value: 'pending',    label: 'Pending' },
  { value: 'approved',   label: 'Approved' },
  { value: 'ordered',    label: 'Ordered' },
  { value: 'received',   label: 'Received' },
  { value: 'cancelled',  label: 'Cancelled' },
] as const

function fmtRp(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('id-ID').format(n)
}

export default async function PurchasingPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const activeTab: Tab = (TABS as readonly string[]).includes(sp.tab ?? '') ? (sp.tab as Tab) : 'suppliers'
  const q = sp.q?.trim() || null
  const status = sp.status || null
  const [counts, rows] = await Promise.all([loadCounts(), loadTab(activeTab, q, status)])

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: 'Owner', href: '/owner' }, { label: 'Purchasing' }]} />

      <div>
        <h1 className="display-lg flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-[var(--color-brand-500)]" />
          Purchasing
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Suppliers → Materials → Purchase Requests → Purchase Orders. Phase 2 (migration 018).
        </p>
      </div>

      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <TabsTrigger key={t} value={t} active={activeTab === t} href={`/owner/purchasing?tab=${t}`}>
              {TAB_LABEL[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent active>
          <div className="mt-4">
            <ListFilters
              basePath="/owner/purchasing"
              searchPlaceholder={activeTab === 'suppliers' ? 'Cari supplier (nama/kode)…' :
                                 activeTab === 'materials' ? 'Cari material (nama/kode/kategori)…' :
                                 activeTab === 'purchase_requests' ? 'Cari purchase request (judul)…' :
                                 'Cari PO (kode)…'}
              searchValue={q ?? ''}
              extraParams={{ tab: activeTab, status: status ?? '' }}
              chips={(activeTab === 'purchase_requests' || activeTab === 'purchase_orders')
                ? [
                    { label: 'Semua status', value: '', active: !status, param: 'status' },
                    ...PO_STATUS_CHIPS.map(c => ({ ...c, active: status === c.value, param: 'status' as const })),
                  ]
                : []}
            />
          </div>

          {activeTab === 'suppliers' && <SupplierCreateForm />}
          {activeTab === 'materials' && <MaterialCreateForm />}
          {activeTab === 'purchase_requests' && <PurchaseRequestCreateForm />}
          {activeTab === 'purchase_orders' && <PurchaseOrderCreateForm />}

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">
                {TAB_LABEL[activeTab]} ({rows.length})
                {(status || q) ? <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">— terfilter</span> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">
                  {(status || q) ? 'Tidak ada data sesuai filter.' : 'Belum ada data.'}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border-subtle)]">
                  {rows.map((r: any) => (
                    <li key={r.id} className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        {activeTab === 'suppliers' && (
                          <>
                            <p className="font-medium">{r.name}</p>
                            {r.code && <Badge variant="outline">{r.code}</Badge>}
                            <Badge variant={r.is_active ? 'success' : 'default'}>
                              {r.is_active ? 'aktif' : 'nonaktif'}
                            </Badge>
                            <span className="text-xs text-[var(--color-text-tertiary)]">{r.phone ?? '—'}</span>
                          </>
                        )}
                        {activeTab === 'materials' && (
                          <>
                            <p className="font-medium">{r.name}</p>
                            {r.code && <Badge variant="outline">{r.code}</Badge>}
                            <Badge variant="info">{r.unit}</Badge>
                            {r.category && <Badge variant="outline">{r.category}</Badge>}
                            {Number(r.standard_price_rupiah) > 0 && (
                              <span className="text-xs">Rp {fmtRp(r.standard_price_rupiah)}</span>
                            )}
                          </>
                        )}
                        {activeTab === 'purchase_requests' && (
                          <>
                            <p className="font-medium">{r.title}</p>
                            {r.code && <Badge variant="outline">{r.code}</Badge>}
                            <Badge variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'destructive' : 'warning'}>
                              {r.status}
                            </Badge>
                          </>
                        )}
                        {activeTab === 'purchase_orders' && (
                          <>
                            <p className="font-medium">{r.code ?? r.id.slice(0, 8)}</p>
                            <Badge variant={r.status === 'received' ? 'success' : r.status === 'cancelled' ? 'destructive' : 'info'}>
                              {r.status}
                            </Badge>
                            <span className="text-xs">Rp {fmtRp(r.total_rupiah)}</span>
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
