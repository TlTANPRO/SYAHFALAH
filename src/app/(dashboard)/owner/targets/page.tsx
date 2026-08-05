// app/(dashboard)/owner/targets/page.tsx
// Plan C Phase 1 Item 2 — target cascade logic view.
// Owner-only (guard inherited from owner/layout.tsx).
// Read-only: surfaces the cascade_level hierarchy + parent_target_id
// self-FK + auto_calculate flag added in Wave 1 migrations 013/014.

import { createClient } from '@supabase/supabase-js'
import { GitBranch, Target } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { CascadeTree, type CascadeNode } from './CascadeTree'

async function loadCascade(year: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const [defsRes, targetsRes] = await Promise.all([
    supabase
      .from('kpi_definitions')
      .select('id, code, name, level, cascade_level, parent_kpi_id, is_active')
      .eq('is_active', true)
      .order('cascade_level', { ascending: true, nullsFirst: false })
      .order('code'),
    supabase
      .from('kpi_targets')
      .select('id, kpi_definition_id, period, target_value, parent_target_id, cascade_period, auto_calculate')
      .gte('period', `${year}-01`)
      .lte('period', `${year}-12`),
  ])

  if (defsRes.error || targetsRes.error) return null

  type Def = NonNullable<typeof defsRes.data>[number]
  type Tgt = NonNullable<typeof targetsRes.data>[number]

  const defs = (defsRes.data ?? []) as Def[]
  const targets = (targetsRes.data ?? []) as Tgt[]
  const defById = new Map(defs.map((d) => [d.id, d]))
  const childrenByParent = new Map<string, Def[]>()
  for (const d of defs) {
    if (d.parent_kpi_id) {
      const arr = childrenByParent.get(d.parent_kpi_id) ?? []
      arr.push(d)
      childrenByParent.set(d.parent_kpi_id, arr)
    }
  }

  const buildNode = (d: Def): CascadeNode => ({
    definition: {
      id: d.id,
      code: d.code,
      name: d.name,
      level: d.level,
      cascade_level: d.cascade_level,
      parent_kpi_id: d.parent_kpi_id,
    },
    targets: targets
      .filter((t) => t.kpi_definition_id === d.id)
      .map((t) => ({
        id: t.id,
        kpi_definition_id: t.kpi_definition_id,
        period: t.period,
        target_value: t.target_value,
        parent_target_id: t.parent_target_id,
        cascade_period: t.cascade_period,
        auto_calculate: t.auto_calculate,
      })),
    children: (childrenByParent.get(d.id) ?? []).map(buildNode),
    parentName: d.parent_kpi_id ? defById.get(d.parent_kpi_id)?.name ?? null : null,
  })

  const roots = defs.filter((d) => d.parent_kpi_id == null).map(buildNode)

  const summary = {
    year,
    total_definitions: defs.length,
    cascade_setup_count: defs.filter((d) => d.cascade_level != null).length,
    target_rows: targets.length,
    auto_calc_targets: targets.filter((t) => t.auto_calculate).length,
  }

  return { roots, summary }
}

interface PageProps {
  searchParams: Promise<{ year?: string }>
}

const CURRENT_YEAR = new Date().getFullYear()

export default async function TargetCascadePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const year = Number(sp.year) || CURRENT_YEAR

  const data = await loadCascade(year)

  if (!data) {
    return (
      <div className="space-y-6">
        <Breadcrumbs crumbs={[
          { label: 'Owner', href: '/owner' },
          { label: 'Target Cascade' },
        ]} />
        <div className="card">
          <div className="card-body text-center text-sm text-[var(--color-text-muted)]">
            Gagal memuat data target. Coba segarkan halaman.
          </div>
        </div>
      </div>
    )
  }

  const { roots, summary } = data

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[
        { label: 'Owner', href: '/owner' },
        { label: 'Target Cascade' },
      ]} />

      <div>
        <h1 className="display-lg flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-[var(--color-brand-500)]" />
          Target Cascade
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Hirarki target tahunan → kuartalan → bulanan → mingguan → harian.
          Kolom cascade dari Plan C Wave 1 (migration 014).
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
              Total KPI defs
            </p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums">
              {summary.total_definitions}
            </p>
          </div>
        </div>
        <div className="card bg-emerald-500/10">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
              Cascade siap
            </p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-emerald-500">
              {summary.cascade_setup_count}
            </p>
          </div>
        </div>
        <div className="card bg-sky-500/10">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
              Target rows
            </p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-sky-500">
              {summary.target_rows}
            </p>
          </div>
        </div>
        <div className="card bg-amber-500/10">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
              Auto-calculate
            </p>
            <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-amber-500">
              {summary.auto_calc_targets}
            </p>
          </div>
        </div>
      </div>

      <CascadeTree roots={roots} year={year} />
    </div>
  )
}
