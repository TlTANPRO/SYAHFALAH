// src/app/(dashboard)/admin/audit/page.tsx
// Audit log viewer. Shows recent CRUD activity per entity.

import { createClient } from '@supabase/supabase-js'
import { History, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getAuditEntries(opts: { table?: string; ids?: string[]; limit?: number }) {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    let query = (sb.from('api_audit_log') as any)
      .select('id, user_id, table_name, row_id, action, before, after, created_at, users:user_id(name)')
      .order('created_at', { ascending: false })
      .limit(opts.limit ?? 100)

    if (opts.table) {
      query = query.eq('table_name', opts.table)
    }
    if (opts.ids && opts.ids.length > 0) {
      query = query.in('row_id', opts.ids)
    }

    const { data, error } = await query
    if (error) {
      // Table doesn't exist
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return []
      }
      return []
    }
    return data ?? []
  } catch {
    return []
  }
}

async function getCurrentUserName(): Promise<string> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return 'Anonim'
    const payload = await verifyAccessToken(accessToken)
    return payload?.name ?? 'Anonim'
  } catch {
    return 'Anonim'
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} hari lalu`
  return formatTime(iso)
}

const ACTION_COLORS: Record<string, { label: string; variant: 'success' | 'info' | 'destructive' }> = {
  INSERT: { label: 'Dibuat', variant: 'success' },
  UPDATE: { label: 'Diubah', variant: 'info' },
  DELETE: { label: 'Dihapus', variant: 'destructive' },
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; ids?: string }>
}) {
  const params = await searchParams
  const entries = await getAuditEntries({
    table: params.entity,
    ids: params.ids?.split(',').filter(Boolean),
    limit: 200,
  })

  const currentUser = await getCurrentUserName()
  
  // Group by date for readability
  const grouped: Record<string, typeof entries> = {}
  for (const entry of entries) {
    const date = new Date(entry.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(entry)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow eyebrow-brand">Admin · Audit Log</p>
        <h1 className="text-3xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Riwayat perubahan data {params.entity && <>untuk entity <code className="font-mono">{params.entity}</code></>}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Total Entries</p>
            <p className="text-2xl font-semibold mt-1">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">INSERT</p>
            <p className="text-2xl font-semibold mt-1 text-[var(--color-success)]">
              {entries.filter((e: any) => e.action === 'INSERT').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">UPDATE</p>
            <p className="text-2xl font-semibold mt-1 text-[var(--color-brand-500)]">
              {entries.filter((e: any) => e.action === 'UPDATE').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">DELETE</p>
            <p className="text-2xl font-semibold mt-1 text-[var(--color-danger)]">
              {entries.filter((e: any) => e.action === 'DELETE').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter chip if filtered */}
      {(params.entity || params.ids) && (
        <div className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <span className="text-[var(--color-text-secondary)]">Filter aktif:</span>
          {params.entity && <Badge variant="info">{params.entity}</Badge>}
          {params.ids && <Badge variant="outline">{params.ids.split(',').length} baris</Badge>}
          <a href="/admin/audit" className="text-[var(--color-brand-500)] hover:underline ml-2">
            Hapus filter
          </a>
        </div>
      )}

      {/* Entries */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <History className="h-12 w-12 mx-auto text-[var(--color-text-tertiary)] opacity-50 mb-3" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              Belum ada aktivitas tercatat.
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-2 max-w-md mx-auto">
              Tabel <code className="font-mono">api_audit_log</code> belum dibuat. Jalankan migration
              {' '}<code className="font-mono">20260810_create_api_audit_log.sql</code> di Supabase Dashboard untuk mengaktifkan audit trail.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayEntries]: [string, any]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 sticky top-0 bg-[var(--color-surface-0)] py-1">
                {date}
              </h2>
              <Card>
                <CardContent className="p-0">
                  <ol className="divide-y divide-[var(--color-border-subtle)]">
                    {dayEntries.map((entry: any) => {
                      const meta = ACTION_COLORS[entry.action] ?? ACTION_COLORS.UPDATE
                      const changes = entry.action === 'UPDATE' && entry.before && entry.after
                        ? Object.keys(entry.after as Record<string, unknown>).filter(
                            (k) => JSON.stringify((entry.before as Record<string, unknown>)?.[k]) !== JSON.stringify((entry.after as Record<string, unknown>)?.[k])
                          )
                        : []
                      return (
                        <li key={entry.id} className="p-4 hover:bg-[var(--color-surface-1)] transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={meta.variant}>{meta.label}</Badge>
                                <span className="text-sm font-medium">
                                  {entry.users?.name ?? 'Anonim'}
                                </span>
                                <span className="text-xs text-[var(--color-text-tertiary)]">·</span>
                                <code className="text-xs font-mono text-[var(--color-text-secondary)]">
                                  {entry.table_name}
                                </code>
                                <span className="text-xs text-[var(--color-text-tertiary)]">·</span>
                                <code className="text-xs font-mono text-[var(--color-text-tertiary)]">
                                  #{String(entry.row_id).slice(0, 8)}
                                </code>
                              </div>
                              {changes.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {changes.slice(0, 5).map((field) => (
                                    <Badge key={field} variant="outline" className="text-xs">
                                      {field}
                                    </Badge>
                                  ))}
                                  {changes.length > 5 && (
                                    <span className="text-xs text-[var(--color-text-tertiary)]">
                                      +{changes.length - 5} field lainnya
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <time className="text-xs text-[var(--color-text-tertiary)] whitespace-nowrap" title={formatTime(entry.created_at)}>
                              {relTime(entry.created_at)}
                            </time>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
