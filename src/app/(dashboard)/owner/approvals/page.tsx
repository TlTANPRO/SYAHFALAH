// app/(dashboard)/owner/approvals/page.tsx
// Plan C Phase 1 Item 6 — Approval workflow v2 (lite version).
// Adds a real approvals tab alongside the existing notifications view.
//
// Owner-only (existing layout guard). Service-role reads. Mutations
// through /api/approvals and /api/approvals/[id]/decision.

import { t } from '@/lib/l10n'
import { createClient } from '@supabase/supabase-js'
import { ClipboardCheck, Plus, Check, X } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ListFilters } from '@/components/ui/ListFilters'
import { ApprovalRequestForm } from './ApprovalRequestForm'
import { ApprovalDecisionActions } from './ApprovalDecisionActions'

export interface ApprovalRow {
  id: string
  requester_id: string
  approver_id: string | null
  title: string
  description: string | null
  kind: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  amount: number | null
  metadata: Record<string, unknown>
  decided_at: string | null
  decision_note: string | null
  created_at: string
  updated_at: string
  requester?: { id: string; full_name: string; email: string } | null | { id: string; full_name: string; email: string }[]
  approver?: { id: string; full_name: string; email: string } | null | { id: string; full_name: string; email: string }[]
}

interface PageProps { searchParams: Promise<{ q?: string; status?: string; kind?: string }> }

async function loadApprovals(q: string | null = null, status: string | null = null, kind: string | null = null): Promise<ApprovalRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  let r = supabase.from('approvals').select(`
      id, requester_id, approver_id, title, description, kind, status,
      amount, metadata, decided_at, decision_note, created_at, updated_at,
      requester:users!approvals_requester_id_fkey(id, full_name, email),
      approver:users!approvals_approver_id_fkey(id, full_name, email)
    `)
  if (q) r = r.ilike('title', `%${q}%`)
  if (status) r = r.eq('status', status)
  if (kind) r = r.eq('kind', kind)
  const { data } = await r.order('created_at', { ascending: false }).limit(50)
  return (data ?? []) as unknown as ApprovalRow[]
}

const KIND_LABEL: Record<string, string> = {
  general: 'Umum', spending: 'Pengeluaran', leave: 'Cuti',
  access: 'Akses', budget: 'Budget', sow: 'SOW',
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'info'> = {
  pending: 'warning', approved: 'success', rejected: 'destructive', cancelled: 'info',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak', cancelled: 'Dibatalkan',
}

function fmtAmount(n: number | null): string {
  if (n == null) return ''
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function fmtTs(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ApprovalsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = sp.q?.trim() || null
  const statusFilter = sp.status || null
  const kindFilter = sp.kind || null
  const approvals = await loadApprovals(q, statusFilter, kindFilter)
  // If status is filtered, split into 'decision-needed' (pending) vs decided.
  // Otherwise show global split.
  const pending = approvals.filter(a => a.status === 'pending')
  const decided = approvals.filter(a => a.status !== 'pending')

  // Helper: normalize embedded users join (PostgREST returns either object or array).
  const requesterName = (a: ApprovalRow): string => {
    const r = a.requester as any
    if (Array.isArray(r)) return r[0]?.full_name ?? a.requester_id.slice(0, 8)
    return r?.full_name ?? a.requester_id.slice(0, 8)
  }
  const approverName = (a: ApprovalRow): string => {
    const p = a.approver as any
    if (!a.approver_id) return '—'
    if (Array.isArray(p)) return p[0]?.full_name ?? a.approver_id.slice(0, 8)
    return p?.full_name ?? a.approver_id.slice(0, 8)
  }
  const filtered = Boolean(q || statusFilter || kindFilter)

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: 'Owner', href: '/owner' }, { label: 'Persetujuan' }]} />

      <div>
        <h1 className="display-lg flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-[var(--color-brand-500)]" />
          Persetujuan
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Approval workflow v2 — state machine dengan pending/approved/rejected/cancelled.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card"><div className="card-body">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Total</p>
          <p className="mt-2 text-3xl font-heading font-bold tabular-nums">{approvals.length}</p>
        </div></div>
        <div className="card bg-[var(--color-warning)]/10"><div className="card-body">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Pending</p>
          <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-[var(--color-warning)]">{pending.length}</p>
        </div></div>
        <div className="card bg-[var(--color-verdigris-500)]/10"><div className="card-body">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Disetujui</p>
          <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-[var(--color-verdigris-500)]">
            {approvals.filter(a => a.status === 'approved').length}
          </p>
        </div></div>
        <div className="card bg-[var(--color-danger)]/10"><div className="card-body">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Ditolak</p>
          <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-[var(--color-danger)]">
            {approvals.filter(a => a.status === 'rejected').length}
          </p>
        </div></div>
      </div>

      {/* Request form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Request approval baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ApprovalRequestForm />
        </CardContent>
      </Card>

      <ListFilters
        basePath="/owner/approvals"
        searchPlaceholder="Cari approval (judul)…"
        searchValue={q ?? ''}
        extraParams={{ status: statusFilter ?? '', kind: kindFilter ?? '' }}
        chips={[
          { label: 'Semua',         value: '',  active: !statusFilter, param: 'status' },
          { label: 'Menunggu',      value: 'pending',   active: statusFilter === 'pending',   param: 'status' },
          { label: 'Disetujui',     value: 'approved',  active: statusFilter === 'approved',  param: 'status' },
          { label: 'Ditolak',       value: 'rejected',  active: statusFilter === 'rejected',  param: 'status' },
          { label: 'Dibatalkan',    value: 'cancelled', active: statusFilter === 'cancelled', param: 'status' },
        ]}
      />

      {/* Pending list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pending ({pending.length})
            {filtered && <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">— terfilter</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">
              {filtered ? 'Tidak ada approval pending sesuai filter.' : 'Tidak ada approval menunggu.'}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-subtle)]">
              {pending.map(a => (
                <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{a.title}</p>
                      <Badge variant="outline">{KIND_LABEL[a.kind] ?? a.kind}</Badge>
                      <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                      {a.amount != null && <Badge variant="outline">{fmtAmount(a.amount)}</Badge>}
                    </div>
                    {a.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                        {a.description}
                      </p>
                    )}
                    <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 font-mono">
                      oleh {requesterName(a)} · {fmtTs(a.created_at)}
                    </p>
                  </div>
                  <ApprovalDecisionActions id={a.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat ({decided.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {decided.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">
              {filtered ? 'Tidak ada riwayat sesuai filter.' : 'Belum ada approval yang diputuskan.'}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-subtle)]">
              {decided.map(a => (
                <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <div className={`mt-1 h-6 w-6 inline-flex items-center justify-center rounded-full flex-shrink-0 ${
                    a.status === 'approved' ? 'bg-[var(--color-verdigris-500)]/15 text-[var(--color-verdigris-500)]'
                      : a.status === 'rejected' ? 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]'
                      : 'bg-[var(--color-info)]/15 text-[var(--color-info)]'
                  }`}>
                    {a.status === 'approved' ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{a.title}</p>
                      <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                      <Badge variant="outline">{KIND_LABEL[a.kind] ?? a.kind}</Badge>
                    </div>
                    {a.decision_note && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1 italic">
                        "{a.decision_note}"
                      </p>
                    )}
                    <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 font-mono">
                      oleh {requesterName(a)} · diputuskan {fmtTs(a.decided_at)}
                      {a.approver_id && ` oleh ${approverName(a)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
