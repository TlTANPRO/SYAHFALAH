// divisi/[divisionId]/kpi/page.tsx
// Division KPI detail. Server-side, queries the team_personal_kpis view
// filtered by division_id + the division_kpi_summary view.

import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, TrendingUp, CheckCircle } from 'lucide-react'
import { PersonalKpiTable } from '@/components/kpi/PersonalKpiTable'

interface Member {
  user_id: string
  name: string
  position: string
  division_id: string
  division_name: string
  kpi_count: number
  avg_progress: number | null
  achieved_count: number
  on_track_count: number
  at_risk_count: number
  off_track_count: number
}

interface DivisionSummary {
  division_id: string
  division_name: string
  kpi_count: number
  avg_progress: number | null
  achieved_count: number
  on_track_count: number
  at_risk_count: number
  off_track_count: number
}

async function load(divisionId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { summary: null, members: [], division: null }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [{ data: summary }, { data: members }, { data: division }] = await Promise.all([
    supabase
      .from('division_kpi_summary')
      .select('division_id, division_name, kpi_count, avg_progress, achieved_count, on_track_count, at_risk_count, off_track_count')
      .eq('division_id', divisionId)
      .single(),
    supabase
      .from('team_personal_kpis')
      .select('user_id, name, position, division_id, division_name, kpi_count, avg_progress, achieved_count, on_track_count, at_risk_count, off_track_count')
      .eq('division_id', divisionId)
      .order('avg_progress', { ascending: false }),
    supabase.from('divisions').select('id, name, code').eq('id', divisionId).single(),
  ])
  return {
    summary: (summary ?? null) as DivisionSummary | null,
    members: (members ?? []) as Member[],
    division: division ?? null,
  }
}

export default async function Page({ params }: { params: Promise<{ divisionId: string }> }) {
  const { divisionId } = await params
  const { summary, members, division } = await load(divisionId)

  if (!division) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-bold">Divisi tidak ditemukan</h1>
        <p className="text-muted-foreground">ID: {divisionId}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{division.name}</h1>
        <p className="text-muted-foreground">
          <Badge variant="outline" className="mr-2">{division.code}</Badge>
          {summary ? `${summary.kpi_count} KPI · ${members.length} anggota` : 'Belum ada KPI'}
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">Avg Progress</span>
              </div>
              <div className="font-heading text-2xl font-bold tabular-nums">
                {summary.avg_progress != null ? `${Math.round(summary.avg_progress)}%` : '—'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">Achieved</span>
              </div>
              <div className="font-heading text-2xl font-bold tabular-nums text-success">{summary.achieved_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">On Track</span>
              </div>
              <div className="font-heading text-2xl font-bold tabular-nums">{summary.on_track_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <span className="text-xs uppercase tracking-wide">At Risk / Off Track</span>
              </div>
              <div className="font-heading text-2xl font-bold tabular-nums text-destructive">
                {summary.at_risk_count + summary.off_track_count}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Performa Tim</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonalKpiTable members={members} />
        </CardContent>
      </Card>
    </div>
  )
}
