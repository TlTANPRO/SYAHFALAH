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
import { ListFilters } from '@/components/ui/ListFilters'
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

const SURVEY_RESULT_CHIPS = [
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'pending', label: 'Pending' },
  { value: 'revisit', label: 'Revisit' },
] as const

const SURVEY_RESULT_PLACEHOLDER: Record<Tab, string> = {
  customers: 'Cari customer (nama/kode)…',
  surveys: 'Cari survey (ID)…',
  bookings: 'Cari booking (ID)…',
  sp3k: 'Cari SP3K (ID)…',
  akad: 'Cari Akad (ID)…',
}

interface PageProps {
  searchParams: Promise<{ tab?: string; q?: string; result?: string; status?: string }>
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

async function loadTab(tab: Tab, q: string | null = null, result: string | null = null, status: string | null = null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  if (tab === 'customers') {
    let r = supabase.from('customers').select('id, code, full_name, phone, email, ktp_number, notes, created_at')
    if (q) r = r.or(`full_name.ilike.%${q}%,code.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
    const { data } = await r.order('created_at', { ascending: false }).limit(50)
    return data ?? []
  }
  if (tab === 'surveys') {
    let r = supabase.from('surveys').select('id, lead_id, customer_id, surveyor_id, cluster_id, scheduled_date, completed_date, result, created_at')
    if (result) r = r.eq('result', result)
    const { data } = await r.order('created_at', { ascending: false }).limit(50)
    return data ?? []
  }
  if (tab === 'bookings') {
    let r = supabase.from('bookings').select('id, lead_id, customer_id, cluster_id, booking_date, booking_fee, status, created_at')
    if (status) r = r.eq('status', status)
    const { data } = await r.order('created_at', { ascending: false }).limit(50)
    return data ?? []
  }
  if (tab === 'sp3k') {
    let r = supabase.from('sp3k').select('id, booking_id, customer_id, status, sla_deadline, reviewer_id, reviewed_at, created_at')
    if (status) r = r.eq('status', status)
    const { data } = await r.order('created_at', { ascending: false }).limit(50)
    return data ?? []
  }
  // akad
  let r = supabase.from('akad').select('id, sp3k_id, customer_id, notaris_id, scheduled_date, signed_date, notary_name, notary_fee, status, created_at')
  if (status) r = r.eq('status', status)
  const { data } = await r.order('created_at', { ascending: false }).limit(50)
  return data ?? []
}

const BOOKING_STATUS_CHIPS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
] as const

const SP3K_STATUS_CHIPS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

const AKAD_STATUS_CHIPS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'signed', label: 'Signed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rescheduled', label: 'Rescheduled' },
] as const

function fmtTs(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function MarketingPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const activeTab: Tab = (TABS as readonly string[]).includes(sp.tab ?? '') ? (sp.tab as Tab) : 'customers'
  const q = sp.q?.trim() || null
  const resultFilter = sp.result || null
  const statusFilter = sp.status || null
  const [counts, rows] = await Promise.all([
    loadCounts(),
    loadTab(activeTab, q, resultFilter, statusFilter),
  ])
  const filtered = Boolean(q || resultFilter || statusFilter)

  // Determine which chips to show for the current tab.
  function chipsForActive(): Array<{ label: string; value: string; active: boolean; param: string }> {
    if (activeTab === 'surveys') {
      return [
        { label: 'Semua', value: '', active: !resultFilter, param: 'result' },
        ...SURVEY_RESULT_CHIPS.map(c => ({ ...c, active: resultFilter === c.value, param: 'result' as const })),
      ]
    }
    if (activeTab === 'bookings') {
      return [
        { label: 'Semua status', value: '', active: !statusFilter, param: 'status' },
        ...BOOKING_STATUS_CHIPS.map(c => ({ ...c, active: statusFilter === c.value, param: 'status' as const })),
      ]
    }
    if (activeTab === 'sp3k') {
      return [
        { label: 'Semua status', value: '', active: !statusFilter, param: 'status' },
        ...SP3K_STATUS_CHIPS.map(c => ({ ...c, active: statusFilter === c.value, param: 'status' as const })),
      ]
    }
    if (activeTab === 'akad') {
      return [
        { label: 'Semua status', value: '', active: !statusFilter, param: 'status' },
        ...AKAD_STATUS_CHIPS.map(c => ({ ...c, active: statusFilter === c.value, param: 'status' as const })),
      ]
    }
    return []
  }

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
          <div className="mt-4">
            <ListFilters
              basePath="/owner/marketing"
              searchPlaceholder={SURVEY_RESULT_PLACEHOLDER[activeTab]}
              searchValue={q ?? ''}
              extraParams={{
                tab: activeTab,
                result: resultFilter ?? '',
                status: statusFilter ?? '',
              }}
              chips={chipsForActive() as any}
            />
          </div>

          {activeTab === 'customers' ? (
            <CustomerCreateForm />
          ) : (
            <EntityCreateForm entity={activeTab} />
          )}

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">
                {TAB_LABEL[activeTab]} ({rows.length})
                {filtered && <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">— terfilter</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">
                  {filtered ? 'Tidak ada data sesuai filter.' : 'Belum ada data. Buat entri pertama Anda dengan form di atas.'}
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
