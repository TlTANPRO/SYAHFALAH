// app/api/team/route.ts
// Server-side list for kepala-kantor team page (per-division with team count).

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { handleList, type CrudConfig } from '@/lib/api/crud-handler'

const TEAM_CONFIG: CrudConfig<'team'> = {
  entity: 'team',
  table: 'divisions',
  selectFields: 'id, name, description, created_at',
  defaultOrder: { column: 'name', ascending: true },
  defaultPageSize: 12,
  maxPageSize: 50,
  queryLikeFilters: { q: 'name' },
  listExtraFilters: [
    { column: 'name', op: 'neq', value: 'Test Seed' },
  ],
}

export async function GET(req: NextRequest) {
  // Call generic handler then enrich with member counts (small set, OK to do in-memory)
  const res = await handleList(req, TEAM_CONFIG)
  if (!res.ok) return res
  const body = await res.clone().json()
  if (!body.data || body.data.length === 0) return res

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const ids = body.data.map((d: { id: string }) => d.id)
  const { data: userCounts } = await sb
    .from('users')
    .select('division_id')
    .in('division_id', ids)
    .eq('is_active', true)

  const countMap = new Map<string, number>()
  for (const u of userCounts ?? []) {
    if (u.division_id) countMap.set(u.division_id, (countMap.get(u.division_id) || 0) + 1)
  }
  body.data = body.data.map((d: { id: string } & Record<string, unknown>) => ({
    ...d,
    member_count: countMap.get(d.id) ?? 0,
  }))
  return NextResponse.json(body)
}