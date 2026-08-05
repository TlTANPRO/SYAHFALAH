// kepala-kantor/team/page.tsx
// Manager's view of all team members across divisions. Reuses the
// team_personal_kpis view directly.

import { createClient } from '@supabase/supabase-js'
import { Card, CardContent } from '@/components/ui/card'
import { PersonalKpiTable } from '@/components/kpi/PersonalKpiTable'
import { TeamClient } from './TeamClient'
import { Users } from 'lucide-react'

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
  if (!url || !key) return { members: [], divisions: [], total: 0 }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const [{ data }, { data: divisions, count }] = await Promise.all([
    supabase
      .from('team_personal_kpis')
      .select('user_id, name, position, division_id, division_name, kpi_count, avg_progress, achieved_count, on_track_count, at_risk_count, off_track_count')
      .order('avg_progress', { ascending: false }),
    supabase
      .from('divisions')
      .select('id, name, description, created_at', { count: 'exact' })
      .neq('name', 'Test Seed')
      .order('name')
      .range(0, 11),
  ])
  const ids = (divisions ?? []).map((d: any) => d.id)
  const countMap = new Map<string, number>()
  if (ids.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('division_id')
      .in('division_id', ids)
      .eq('is_active', true)
    for (const u of users ?? []) {
      if (u.division_id) countMap.set(u.division_id, (countMap.get(u.division_id) || 0) + 1)
    }
  }
  const enriched = (divisions ?? []).map((d: any) => ({ ...d, member_count: countMap.get(d.id) ?? 0 }))
  return {
    members: (data ?? []) as Member[],
    divisions: enriched,
    total: count ?? 0,
  }
}

export default async function Page() {
  const { members, divisions, total } = await load()
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

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--color-brand-500)]" /> Direktori Divisi
        </h2>
        <TeamClient initialData={divisions} total={total} />
      </div>
    </div>
  )
}
