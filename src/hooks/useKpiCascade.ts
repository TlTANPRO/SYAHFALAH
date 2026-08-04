// hooks/useKpiCascade.ts
//
// Single source of truth for the four Supabase queries that every
// dashboard page in the app needs: company KPIs, division summaries,
// personal KPIs, and division task rollups. Each page used to inline
// the exact same `useQuery` blocks; centralising them here means the
// filter logic (year-wide, current year) lives in one place, and any
// new dashboard page just composes the returned object.
//
// Cache key: a single tuple [year, level, divisionId?] per query so
// TanStack Query can dedupe across pages.

import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '@/providers/SupabaseProvider'
import { useAuthStore } from '@/stores/authStore'

export type KpiRow = {
  id: string
  level: 'company' | 'division' | 'team' | 'personal'
  period: string
  kpi_id: string
  target: number | null
  actual: number | null
  progress: number | null
  status: 'on_track' | 'at_risk' | 'off_track' | 'achieved' | null
}

export type DivisionKpiSummary = {
  division_id: string
  division_name: string
  kpi_count: number
  avg_progress: number | null
  achieved: number
  on_track: number
  at_risk: number
  off_track: number
}

export type PersonalKpiRow = {
  user_id: string
  full_name: string
  division_name: string | null
  kpi_count: number
  avg_progress: number | null
  achieved: number
  on_track: number
  at_risk: number
  off_track: number
}

export type DivisionTaskSummary = {
  division_id: string
  division_name: string
  total_tasks: number
  completed: number
  in_progress: number
  pending: number
  overdue: number
}

function currentYearStart(): string {
  return `${new Date().getFullYear()}-01-01`
}
function currentYearEnd(): string {
  return `${new Date().getFullYear()}-12-31`
}

/**
 * useKpiCascade — fetch all four KPI rollup views for the current
 * user. Returns a single object so consumers can destructure what
 * they need. Each individual query can also be loaded standalone via
 * the named sub-hooks below.
 */
export function useKpiCascade(level: 'company' | 'division' = 'company', divisionId?: string) {
  const { supabase } = useSupabase()
  const year = currentYearStart().slice(0, 4)

  // Company-level KPI rollup
  const companyKpis = useQuery({
    queryKey: ['kpis', level, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('level', level)
        .gte('period_start', currentYearStart())
        .lte('period_end', currentYearEnd())
      if (error) throw error
      return (data ?? []) as KpiRow[]
    },
  })

  // Division summaries (cross-division rollup)
  const divisionSummaries = useQuery({
    queryKey: ['division-summaries', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('division_kpi_summary')
        .select('*')
      if (error) throw error
      return (data ?? []) as DivisionKpiSummary[]
    },
  })

  // Team / personal KPI rollup
  const teamPersonalKpis = useQuery({
    queryKey: ['team-personal-kpis', year, divisionId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_personal_kpis')
        .select('*')
      if (error) throw error
      return (data ?? []) as PersonalKpiRow[]
    },
  })

  // Division task rollup
  const divisionTaskSummary = useQuery({
    queryKey: ['division-task-summary', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('division_task_summary')
        .select('*')
      if (error) throw error
      return (data ?? []) as DivisionTaskSummary[]
    },
  })

  return {
    companyKpis,
    divisionSummaries,
    teamPersonalKpis,
    divisionTaskSummary,
    isLoading:
      companyKpis.isLoading ||
      divisionSummaries.isLoading ||
      teamPersonalKpis.isLoading ||
      divisionTaskSummary.isLoading,
    isError:
      companyKpis.isError ||
      divisionSummaries.isError ||
      teamPersonalKpis.isError ||
      divisionTaskSummary.isError,
  }
}

/**
 * useCompanyKpis — convenience wrapper for pages that only need the
 * top-level rollup. Same params as useKpiCascade minus division rollups.
 */
export function useCompanyKpis() {
  return useKpiCascade('company')
}

/**
 * useDivisionDetail — fetch the per-division detail for a given
 * division id. Used by /divisi/[divisionId] and the kepala-kantor
 * per-division pages.
 */
export function useDivisionDetail(divisionId: string) {
  const { teamPersonalKpis, divisionTaskSummary, companyKpis } = useKpiCascade('division', divisionId)

  return {
    team: teamPersonalKpis.data?.filter((m) => m.division_name) ?? [],
    taskSummary: divisionTaskSummary.data?.find((d) => d.division_id === divisionId),
    companyKpis: companyKpis.data ?? [],
    isLoading:
      teamPersonalKpis.isLoading || divisionTaskSummary.isLoading || companyKpis.isLoading,
    isError:
      teamPersonalKpis.isError || divisionTaskSummary.isError || companyKpis.isError,
  }
}
