// app/api/targets/cascade/route.ts
// Owner-only endpoint that returns KPI definitions + their targets grouped
// by cascade_level, with parent_target_id self-FK traversed. Read-only
// view for Plan C Wave 1 Item 2 (target cascade logic on /owner/targets).
//
// All new columns are nullable; rows without cascade data render in the
// "Belum disetel" bucket, which is fine for the demo state and provides
// a clear upgrade path for owners.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

interface KpiDefinition {
  id: string
  code: string
  name: string
  level: string
  cascade_level: string | null
  parent_kpi_id: string | null
}

interface KpiTarget {
  id: string
  kpi_definition_id: string
  period: string
  target_value: number
  parent_target_id: string | null
  cascade_period: string | null
  auto_calculate: boolean
}

interface CascadeNode {
  definition: KpiDefinition
  targets: KpiTarget[]
  children: CascadeNode[]
}

export async function GET(req: NextRequest) {
  try {
    // Auth (same pattern as /api/kpis)
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    if (payload.role !== 'owner') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const url = req.nextUrl
    const year = Number(url.searchParams.get('year')) || new Date().getFullYear()

    // Fetch definitions + targets for the requested year in parallel.
    const [defsRes, targetsRes] = await Promise.all([
      serviceClient
        .from('kpi_definitions')
        .select('id, code, name, level, cascade_level, parent_kpi_id')
        .eq('is_active', true)
        .order('cascade_level', { ascending: true, nullsFirst: false })
        .order('code'),
      serviceClient
        .from('kpi_targets')
        .select('id, kpi_definition_id, period, target_value, parent_target_id, cascade_period, auto_calculate')
        .gte('period', `${year}-01`)
        .lte('period', `${year}-12`)
        .order('period'),
    ])

    if (defsRes.error) return NextResponse.json({ error: defsRes.error.message }, { status: 500 })
    if (targetsRes.error) return NextResponse.json({ error: targetsRes.error.message }, { status: 500 })

    const defs = (defsRes.data ?? []) as KpiDefinition[]
    const targets = (targetsRes.data ?? []) as KpiTarget[]

    // Build a tree using parent_kpi_id (definition-level hierarchy).
    const defById = new Map(defs.map((d) => [d.id, d]))
    const childrenByParent = new Map<string, KpiDefinition[]>()
    for (const d of defs) {
      if (d.parent_kpi_id) {
        const arr = childrenByParent.get(d.parent_kpi_id) ?? []
        arr.push(d)
        childrenByParent.set(d.parent_kpi_id, arr)
      }
    }

    const buildNode = (d: KpiDefinition): CascadeNode => ({
      definition: d,
      targets: targets.filter((t) => t.kpi_definition_id === d.id),
      children: (childrenByParent.get(d.id) ?? []).map(buildNode),
    })

    // Roots: definitions with no parent_kpi_id (top of cascade tree).
    const roots = defs
      .filter((d) => d.parent_kpi_id == null)
      .map(buildNode)

    // Derived aggregates per definition: cascade_period distribution + total.
    const summary = {
      total_definitions: defs.length,
      cascade_setup_count: defs.filter((d) => d.cascade_level != null).length,
      target_rows: targets.length,
      auto_calc_targets: targets.filter((t) => t.auto_calculate).length,
      year,
    }

    return NextResponse.json({ roots, summary })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
