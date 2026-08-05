// kepala-kantor/team/page.tsx
// Manager's view of all team members across divisions. Reuses the
// team_personal_kpis view directly.

import { createClient } from '@supabase/supabase-js'
import { Card, CardContent } from '@/components/ui/card'
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

async function load() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data } = await supabase
    .from('team_personal_kpis')
    .select('user_id, name, position, division_id, division_name, kpi_count, avg_progress, achieved_count, on_track_count, at_risk_count, off_track_count')
    .order('avg_progress', { ascending: false })
  return (data ?? []) as Member[]
}

export default async function Page() {
  const members = await load()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Team KPIs</h1>
        <p className="text-[var(--color-text-secondary)]">Overview KPI seluruh tim perusahaan</p>
      </div>
      <Card>
        <CardContent>
          <PersonalKpiTable members={members} />
        </CardContent>
      </Card>
    </div>
  )
}
