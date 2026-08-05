// personal/kpi/page.tsx
// Personal KPI dashboard for the currently authenticated user. Reads
// the kpis view (level=personal, user_id=auth.uid()).

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, TrendingUp, CheckCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface KpiRow {
  id: string
  code: string | null
  name: string | null
  unit: string | null
  baseline_target_value: number | null
  actual_value: number | null
  progress: number | null
  status: string | null
  period_start: string | null
  period_end: string | null
}

async function load(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { kpis: [], user: null }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [{ data: kpis }, { data: user }] = await Promise.all([
    supabase
      .from('kpis')
      .select('id, code, name, unit, baseline_target_value, actual_value, progress, status, period_start, period_end')
      .eq('level', 'personal')
      .eq('user_id', userId)
      .order('progress', { ascending: false }),
    supabase.from('users').select('full_name, position, division_id').eq('id', userId).single(),
  ])
  return { kpis: (kpis ?? []) as KpiRow[], user }
}

const statusVariant: Record<string, 'achieved' | 'on-track' | 'at-risk' | 'off-track'> = {
  achieved: 'achieved', on_track: 'on-track', at_risk: 'at-risk', off_track: 'off-track',
}
const statusLabel: Record<string, string> = {
  achieved: 'Achieved', on_track: 'On Track', at_risk: 'At Risk', off_track: 'Off Track',
}

export default async function Page() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const payload = token ? await verifyAccessToken(token) : null
  const userId = payload?.userId

  if (!userId) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-bold">KPI Saya</h1>
        <p className="text-[var(--color-text-secondary)]">Sesi tidak valid. Silakan login ulang.</p>
      </div>
    )
  }

  const { kpis, user } = await load(userId)
  const achieved = kpis.filter(k => k.status === 'achieved').length
  const avgProgress = kpis.length
    ? Math.round(kpis.reduce((s, k) => s + (k.progress || 0), 0) / kpis.length)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">KPI Saya</h1>
        <p className="text-[var(--color-text-secondary)]">
          {user?.position || 'User'} · {kpis.length} KPI personal · {achieved} tercapai
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-1">
              <Target className="h-3.5 w-3.5" />
              <span className="text-xs uppercase tracking-wide">Total KPI</span>
            </div>
            <div className="font-heading text-2xl font-bold tabular-nums">{kpis.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-1">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="text-xs uppercase tracking-wide">Achieved</span>
            </div>
            <div className="font-heading text-2xl font-bold tabular-nums text-[var(--color-success)]">{achieved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs uppercase tracking-wide">Avg Progress</span>
            </div>
            <div className="font-heading text-2xl font-bold tabular-nums">{avgProgress}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail KPI</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)]">
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">KPI</th>
                  <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Progress</th>
                  <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Target</th>
                  <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Actual</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map(k => (
                  <tr key={k.id} className="border-b border-[var(--color-border-default)]/50 hover:bg-[var(--color-surface-2)]/30 transition-colors">
                    <td className="p-3">
                      <Link
                        href={k.code ? `/kpi/${encodeURIComponent(k.code)}` : `/kpi/${k.id}`}
                        className="group inline-flex items-center gap-1 text-[var(--color-brand-500)] hover:underline"
                        aria-label={`Buka detail ${k.code ?? k.name ?? 'KPI'}`}
                      >
                        <div>
                          <div className="font-medium">{k.name || '—'}</div>
                          <div className="font-mono text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-brand-500)]">{k.code || '—'}</div>
                        </div>
                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </Link>
                    </td>
                    <td className="p-3 text-right tabular-nums font-medium">
                      {k.progress != null ? `${Math.round(k.progress)}%` : '—'}
                    </td>
                    <td className="p-3 text-right tabular-nums text-[var(--color-text-secondary)]">
                      {k.baseline_target_value != null ? `${k.baseline_target_value}${k.unit || ''}` : '—'}
                    </td>
                    <td className="p-3 text-right tabular-nums text-[var(--color-text-secondary)]">
                      {k.actual_value != null ? `${k.actual_value}${k.unit || ''}` : '—'}
                    </td>
                    <td className="p-3">
                      {k.status && (
                        <Badge variant={statusVariant[k.status] || 'default'}>
                          {statusLabel[k.status] || k.status}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
