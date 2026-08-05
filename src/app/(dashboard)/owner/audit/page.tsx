// app/(dashboard)/owner/audit/page.tsx
// Plan C Phase 1 Item 3 — Audit log query page.
// Owner-only (guard inherited from owner/layout.tsx).
// Read-only view: filter by action / table_name / user_id, paginate,
// inspect old_data + new_data JSONB. Empty-state aware (DB currently
// has 0 rows; mutation triggers are a separate sprint item).

import { createClient } from '@supabase/supabase-js'
import { Activity, FileSearch } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { AuditLogClient, type AuditLogRow } from './AuditLogClient'
import { Card, CardContent } from '@/components/ui/card'

const DISTINCT_TABLES_LIMIT = 50

async function loadInitial() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return {
      rows: [] as AuditLogRow[],
      total: 0,
      knownActions: [] as string[],
      knownTables: [] as string[],
      knownUserIds: [] as { id: string; full_name: string }[],
    }
  }
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const [pageRes, tablesRes, usersRes] = await Promise.all([
    supabase
      .from('audit_logs')
      .select(
        'id, user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(0, 24),
    supabase
      .from('audit_logs')
      .select('table_name')
      .limit(DISTINCT_TABLES_LIMIT),
    supabase
      .from('users')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name')
      .limit(50),
  ])

  const rows = (pageRes.data ?? []) as AuditLogRow[]

  // client-side dedupe (cheap; counts stay small for filter dropdown)
  const actionsSet = new Set<string>()
  const tablesSet = new Set<string>()
  for (const r of rows) if (r.action) actionsSet.add(r.action)
  if (Array.isArray(tablesRes.data)) {
    for (const t of tablesRes.data) if (t.table_name) tablesSet.add(t.table_name)
  }

  return {
    rows,
    total: pageRes.count ?? 0,
    knownActions: Array.from(actionsSet).sort(),
    knownTables: Array.from(tablesSet).sort(),
    knownUserIds: ((usersRes.data ?? []) as { id: string; full_name: string }[]),
  }
}

export default async function AuditPage() {
  const { rows, total, knownActions, knownTables, knownUserIds } = await loadInitial()

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[
        { label: 'Owner', href: '/owner' },
        { label: 'Audit Log' },
      ]} />

      <div>
        <h1 className="display-lg flex items-center gap-2">
          <Activity className="h-6 w-6 text-[var(--color-brand-500)]" />
          Audit Log
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Jejak perubahan data sistem. Mutation triggers belum diaktifkan —
          tabel masih kosong sampai penulisan audit dipasang di endpoint
          create/update/delete.
        </p>
      </div>

      {total === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileSearch className="h-10 w-10 mx-auto mb-3 opacity-40 text-[var(--color-text-tertiary)]" />
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              Belum ada audit event tercatat.
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-md mx-auto">
              Halaman ini memantau tabel <code className="font-mono">public.audit_logs</code>.
              Trigger penulisan (insert ke audit_logs dari mutations tasks / users /
              leads) adalah item Phase 1 sprint terpisah.
            </p>
          </CardContent>
        </Card>
      )}

      <AuditLogClient
        initialRows={rows}
        initialTotal={total}
        knownActions={knownActions}
        knownTables={knownTables}
        knownUserIds={knownUserIds}
      />
    </div>
  )
}
