// app/(dashboard)/owner/marketing/page.tsx
// Plan C Phase 2 — Marketing CRM domain owner overview.
// Owner-only (guard inherited from owner/layout.tsx).
// Tabs: customers / surveys / bookings / sp3k / akad.
// Each tab lists recent rows + a small creation form (POST → reload).

import { createClient } from '@supabase/supabase-js'
import { Megaphone, Plus, Loader2 } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CustomerCreateForm } from './CustomerCreateForm'
import { EntityCreateForm } from './EntityCreateForm'

const TABS = ['customers', 'surveys', 'bookings', 'sp3k', 'akad'] as const
type Tab = typeof TABS[number]

const TAB_LABEL: Record<Tab, string> = {
  customers: 'Customers',
  surveys: 'Surveys',
  bookings: 'Bookings',
  sp3k: 'SP3K',
  akad: 'Akad',
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

async function loadCounts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [customers, surveys, bookings, sp3k, akad] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('surveys').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('sp3k').select('id', { count: 'exact', head: true }),
    supabase.from('akad').select('id', { count: 'exact', head: true }),
  ])
  return {
    customers: customers.count ?? 0,
    surveys: surveys.count ?? 0,
    bookings: bookings.count ?? 0,
    sp3k: sp3k.count ?? 0,
    akad: akad.count ?? 0,
  }
}

async function loadTab(tab: Tab) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  if (tab === 'customers') {
    const { data } = await supabase
      .from('customers')
      .select('id, code, full_name, phone, email, ktp_number, notes, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    return data ?? []
  }
  if (tab === 'surveys') {
    const { data } = await supabase
      .from('surveys')
      .select('id, lead_id, customer_id, surveyor_id, cluster_id, scheduled_date, completed_date, result, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    return data ?? []
  }
  if (tab === 'bookings') {
    const { data } = await supabase
      .from('bookings')
      .select('id, lead_id, customer_id, cluster_id, booking_date, booking_fee, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    return data ?? []
  }
  if (tab === 'sp3k') {
    const { data } = await supabase
      .from('sp3k')
      .select('id, booking_id, customer_id, status, sla_deadline, reviewer_id, reviewed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    return data ?? []
  }
  // akad
  const { data } = await supabase
    .from('akad')
    .select('id, sp3k_id, customer_id, notaris_id, scheduled_date, signed_date, notary_name, notary_fee, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  return data ?? []
}

function fmtTs(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function MarketingPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const activeTab: Tab = (TABS as readonly string[]).includes(sp.tab ?? '') ? (sp.tab as Tab) : 'customers'
  const [counts, rows] = await Promise.all([loadCounts(), loadTab(activeTab)])

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: 'Owner', href: '/owner' }, { label: 'Marketing CRM' }]} />

      <div>
        <h1 className="display-lg flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-[var(--color-brand-500)]" />
          Marketing CRM
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Pipeline Lead → Survey → Booking → SP3K → Akad. Phase 2 domain (migration 016).
        </p>
      </div>

      {/* Stats */}
      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
            <TabsTrigger key={t} value={t} active={activeTab === t} href={`/owner/marketing?tab=${t}`}>
              {TAB_LABEL[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent active>
          {activeTab === 'customers' ? (
            <CustomerCreateForm />
          ) : (
            <EntityCreateForm entity={activeTab} />
          )}

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">{TAB_LABEL[activeTab]} ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">
                  Belum ada data. Buat entri pertama Anda dengan form di atas.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border-subtle)]">
                  {rows.map((r: any) => (
                    <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <RowFields row={r} tab={activeTab} />
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

function RowFields({ row, tab }: { row: any; tab: Tab }) {
  if (tab === 'customers') {
    return (
      <>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium">{row.full_name}</p>
          {row.code && <Badge variant="outline">{row.code}</Badge>}
        </div>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
          {row.phone ?? '—'} · {row.email ?? '—'} · dibuat {fmtTs(row.created_at)}
        </p>
      </>
    )
  }
  if (tab === 'surveys') {
    return (
      <>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">Survey</Badge>
          {row.result && (
            <Badge variant={row.result === 'interested' ? 'success' : row.result === 'not_interested' ? 'destructive' : 'info'}>
              {row.result}
            </Badge>
          )}
          {row.scheduled_date && <span className="text-xs">jadwal: {fmtTs(row.scheduled_date)}</span>}
          {row.completed_date && <span className="text-xs">selesai: {fmtTs(row.completed_date)}</span>}
        </div>
        <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 font-mono">
          lead {row.lead_id?.slice(0, 8)} · dibuat {fmtTs(row.created_at)}
        </p>
      </>
    )
  }
  if (tab === 'bookings') {
    return (
      <>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">Booking</Badge>
          <Badge variant={row.status === 'confirmed' ? 'success' : row.status === 'cancelled' ? 'destructive' : 'warning'}>
            {row.status}
          </Badge>
          {row.booking_date && <span className="text-xs">tanggal: {fmtTs(row.booking_date)}</span>}
          {row.booking_fee != null && row.booking_fee > 0 && (
            <Badge variant="outline">Rp {Number(row.booking_fee).toLocaleString('id-ID')}</Badge>
          )}
        </div>
        <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 font-mono">
          lead {row.lead_id?.slice(0, 8)} · dibuat {fmtTs(row.created_at)}
        </p>
      </>
    )
  }
  if (tab === 'sp3k') {
    return (
      <>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">SP3K</Badge>
          <Badge variant={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'destructive' : 'warning'}>
            {row.status}
          </Badge>
          {row.sla_deadline && <span className="text-xs">SLA: {fmtTs(row.sla_deadline)}</span>}
        </div>
        <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 font-mono">
          booking {row.booking_id?.slice(0, 8)} · dibuat {fmtTs(row.created_at)}
        </p>
      </>
    )
  }
  // akad
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline">Akad</Badge>
        <Badge variant={row.status === 'signed' ? 'success' : row.status === 'cancelled' ? 'destructive' : 'info'}>
          {row.status}
        </Badge>
        {row.scheduled_date && <span className="text-xs">jadwal: {fmtTs(row.scheduled_date)}</span>}
        {row.signed_date && <span className="text-xs">ttd: {fmtTs(row.signed_date)}</span>}
        {row.notary_name && <Badge variant="outline">{row.notary_name}</Badge>}
      </div>
      <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 font-mono">
        sp3k {row.sp3k_id?.slice(0, 8)} · dibuat {fmtTs(row.created_at)}
      </p>
    </>
  )
}
