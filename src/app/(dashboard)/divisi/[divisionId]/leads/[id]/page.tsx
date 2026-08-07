// divisi/[divisionId]/leads/[id]/page.tsx
// Lead detail — full profile + score + related records timeline.
// Works for both `divisi/{id}/leads` entry and direct link from any source.

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, User, Building, Calendar, Tag, TrendingUp, FileText, ClipboardCheck, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

const CLUSTER_JOIN = `id, code, customer_name, customer_phone, cluster_id, source, stage, estimated_value_rupiah, assigned_to_id, contacted_at, surveyed_at, booked_at, closing_at, batal_at, batal_reason, created_at, score, cluster:clusters(name, code), assignee:users!leads_assigned_to_id_fkey(id, full_name, email)`

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]',
  contacted: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  surveyed: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  booked: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  closing: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  batal: 'bg-red-500/15 text-red-700 dark:text-red-300',
}

const STAGE_LABELS: Record<string, string> = {
  new: 'Baru',
  contacted: 'Dihubungi',
  surveyed: 'Survei',
  booked: 'Booking',
  closing: 'Akad',
  batal: 'Batal',
}

function fmtTime(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtMoney(n: number | null): string {
  if (!n) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ divisionId: string; id: string }>
}) {
  const { divisionId, id } = await params
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) notFound()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) notFound()
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: lead, error } = await supabase
    .from('leads')
    .select(CLUSTER_JOIN)
    .eq('id', id)
    .maybeSingle()

  if (error || !lead) notFound()

  // Find matching customer (if exists) for booking linkage
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', lead.customer_phone ?? '')
    .maybeSingle()

  // Pull related records in parallel.
  const [{ data: surveys }, { data: bookings }, { data: sp3k }, { data: akad }] =
    await Promise.all([
      supabase
        .from('surveys')
        .select('id, code, scheduled_at, completed_at, result, notes, surveyor:users!surveys_surveyor_id_fkey(full_name)')
        .or(`customer_phone.eq.${lead.customer_phone ?? 'NONE'}`)
        .order('scheduled_at', { ascending: false })
        .limit(20),
      customer
        ? supabase
            .from('bookings')
            .select('id, code, booking_date, scheduled_at, status, booking_amount_rupiah, cluster:clusters(name)')
            .eq('customer_id', customer.id)
            .order('scheduled_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from('sp3k')
        .select('id, code, status, sla_deadline, reviewed_at, review_note')
        .order('sla_deadline', { ascending: false })
        .limit(20),
      supabase
        .from('akad')
        .select('id, code, scheduled_date, status, signed_at')
        .order('scheduled_date', { ascending: false })
        .limit(20),
    ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/divisi/${divisionId}/leads`} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" aria-label="Kembali ke daftar leads">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="display-lg">{lead.customer_name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-[var(--color-text-secondary)]">
            <code className="font-mono text-xs">{lead.code}</code>
            <span>·</span>
            <Badge className={STAGE_COLORS[lead.stage] ?? ''}>
              {STAGE_LABELS[lead.stage] ?? lead.stage}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Profil Lead
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="Nama" value={lead.customer_name} />
              <Field label="Telepon" value={lead.customer_phone} icon={<Phone className="h-3 w-3" />} />
              <Field label="Cluster" value={Array.isArray((lead as any).cluster) ? (lead as any).cluster[0]?.name : (lead as any).cluster?.name ?? '—'} icon={<Building className="h-3 w-3" />} />
              <Field label="Sumber" value={lead.source ?? '—'} icon={<Tag className="h-3 w-3" />} />
              <Field label="Sales" value={Array.isArray((lead as any).assignee) ? (lead as any).assignee[0]?.full_name : (lead as any).assignee?.full_name ?? '—'} />
              <Field label="Estimasi Nilai" value={fmtMoney(lead.estimated_value_rupiah)} />
              <Field label="Dibuat" value={fmtTime(lead.created_at)} icon={<Calendar className="h-3 w-3" />} />
              {lead.stage === 'batal' && (
                <Field label="Alasan Batal">
                  <span className="text-red-600">{lead.batal_reason ?? '—'}</span>
                </Field>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Lead Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="font-heading text-5xl font-bold text-[var(--color-brand-500)]">
                {lead.score ?? 0}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">/ 100</p>
              <div className="mt-4 w-full bg-[var(--color-surface-2)] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[var(--color-brand-500)] h-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, lead.score ?? 0))}%` }}
                />
              </div>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
                Stage + aktivitas + nilai + recency
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative border-l border-[var(--color-border-default)] ml-3 space-y-4">
            <TimelineItem icon={<Phone className="h-3 w-3" />} time={lead.contacted_at} label="Dihubungi" />
            <TimelineItem icon={<ClipboardCheck className="h-3 w-3" />} time={lead.surveyed_at} label="Survei" />
            <TimelineItem icon={<Calendar className="h-3 w-3" />} time={lead.booked_at} label="Booking" />
            <TimelineItem icon={<FileText className="h-3 w-3" />} time={lead.closing_at} label="Akad" />
            {lead.stage === 'batal' && (
              <TimelineItem icon={<Tag className="h-3 w-3" />} time={lead.batal_at} label="Batal" muted note={lead.batal_reason ?? undefined} />
            )}
            <TimelineItem icon={<User className="h-3 w-3" />} time={lead.created_at} label="Lead dibuat" muted />
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RelatedCard
          title="Survei"
          rows={(surveys ?? []).map(s => {
            const surv = Array.isArray((s as any).surveyor) ? (s as any).surveyor[0] : (s as any).surveyor
            return {
              id: s.id, code: s.code,
              subtitle: surv?.full_name ? `oleh ${surv.full_name}` : '',
              time: s.scheduled_at, tag: s.result,
            }
          })}
          emptyText="Belum ada survei untuk lead ini."
        />
        <RelatedCard
          title="Booking"
          rows={(bookings ?? []).map(b => {
            const cluster = Array.isArray((b as any).cluster) ? (b as any).cluster[0] : (b as any).cluster
            return {
              id: b.id, code: b.code,
              subtitle: cluster?.name ?? '',
              time: b.scheduled_at ?? b.booking_date, tag: b.status,
            }
          })}
          emptyText="Belum ada booking."
        />
        <RelatedCard
          title="SP3K"
          rows={(sp3k ?? []).map(p => ({
            id: p.id, code: p.code,
            time: p.sla_deadline ?? p.reviewed_at, tag: p.status,
          }))}
          emptyText="Belum ada SP3K."
        />
        <RelatedCard
          title="Akad"
          rows={(akad ?? []).map(a => ({
            id: a.id, code: a.code,
            time: a.scheduled_date ?? a.signed_at, tag: a.status,
          }))}
          emptyText="Belum ada akad."
        />
      </div>
    </div>
  )
}

function Field({ label, value, icon, children }: { label: string; value?: string | null; icon?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)] mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </dt>
      <dd className="font-medium">{value ?? children ?? '—'}</dd>
    </div>
  )
}

function TimelineItem({ icon, time, label, muted, note }: { icon: React.ReactNode; time: string | null; label: string; muted?: boolean; note?: string }) {
  return (
    <li className="ml-6">
      <span className={`absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-[var(--color-surface-0)] ${muted ? 'bg-[var(--color-surface-2)]' : 'bg-[var(--color-brand-500)] text-white'}`}>
        {icon}
      </span>
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-[var(--color-text-tertiary)]">{time ? fmtTime(time) : 'belum terjadi'}</p>
        {note && <p className="text-sm text-[var(--color-text-secondary)] mt-1">{note}</p>}
      </div>
    </li>
  )
}

function RelatedCard({ title, rows, emptyText }: { title: string; rows: { id: string; code: string; subtitle?: string; time: string | null; tag?: string }[]; emptyText: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--color-text-tertiary)] py-4 text-center">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border-default)]">
            {rows.map(r => (
              <li key={r.id} className="py-2 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-[var(--color-text-secondary)]">{r.code}</p>
                  {r.subtitle && <p className="text-xs text-[var(--color-text-tertiary)]">{r.subtitle}</p>}
                  <p className="text-xs text-[var(--color-text-tertiary)]">{r.time ? fmtTime(r.time) : '—'}</p>
                </div>
                {r.tag && <Badge variant="outline">{r.tag}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
