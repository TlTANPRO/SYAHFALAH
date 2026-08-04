// owner/kpi/page.tsx
// Company-level KPI table for the owner. Same data as /kpi but framed
// for the executive reader, plus broader period coverage.

import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target } from 'lucide-react'

interface KpiRow {
  id: string
  code: string | null
  name: string | null
  level: string
  unit: string | null
  baseline_target_value: number | null
  actual_value: number | null
  progress: number | null
  status: string | null
  period_start: string | null
  period_end: string | null
  division_id: string | null
}

async function load() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { kpis: [], divisions: [] }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [{ data: kpis }, { data: divs }] = await Promise.all([
    supabase
      .from('kpis')
      .select('id, code, name, level, unit, baseline_target_value, actual_value, progress, status, period_start, period_end, division_id')
      .in('level', ['company', 'division'])
      .order('progress', { ascending: false })
      .limit(100),
    supabase.from('divisions').select('id, name'),
  ])
  return { kpis: (kpis ?? []) as KpiRow[], divisions: (divs ?? []) as { id: string; name: string }[] }
}

const statusVariant: Record<string, 'achieved' | 'on-track' | 'at-risk' | 'off-track'> = {
  achieved: 'achieved', on_track: 'on-track', at_risk: 'at-risk', off_track: 'off-track',
}
const statusLabel: Record<string, string> = {
  achieved: 'Achieved', on_track: 'On Track', at_risk: 'At Risk', off_track: 'Off Track',
}

export default async function Page() {
  const { kpis, divisions } = await load()
  const divName = new Map(divisions.map(d => [d.id, d.name]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Company KPIs</h1>
        <p className="text-muted-foreground">Level 1 & 2 — KPI strategis untuk PT Syahfalah Global</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            {kpis.length} KPI aktif
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-foreground">KPI</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Level</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Divisi</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Progress</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Target / Actual</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map(k => (
                  <tr key={k.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="font-medium">{k.name || '—'}</div>
                      <div className="font-mono text-xs text-muted-foreground">{k.code || '—'}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{k.level}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {k.division_id ? divName.get(k.division_id) || '—' : '—'}
                    </td>
                    <td className="p-3 text-right tabular-nums font-medium">
                      {k.progress != null ? `${Math.round(k.progress)}%` : '—'}
                    </td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                      {k.baseline_target_value != null ? `${k.baseline_target_value}${k.unit || ''}` : '—'} / {k.actual_value != null ? `${k.actual_value}${k.unit || ''}` : '—'}
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
