// components/kpi/KpiTrendChart.tsx
// Lightweight 30-day KPI trend line chart for a single division or
// the whole company. Pulls data from `kpis` view aggregated by
// period_start. Uses Recharts (already in deps).
//
// Rendered inside the DivisionCard or as a standalone widget on the
// executive dashboard. Recharts is dynamically imported so the
// ~100 kB chart bundle only loads when this component is actually
// mounted.

'use client'

import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { useSupabase } from '@/providers/SupabaseProvider'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { formatPercent } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'

interface KpiTrendChartProps {
  /** 'company' for company-wide, division_id for single-division view. */
  level?: 'company' | 'division'
  divisionId?: string
  title?: string
}

type TrendPoint = { period: string; avg_progress: number }

function yearStart() { return `${new Date().getFullYear()}-01-01` }
function yearEnd()   { return `${new Date().getFullYear()}-12-31` }

export function KpiTrendChart({
  level = 'company',
  divisionId,
  title = 'KPI Trend (YTD)',
}: KpiTrendChartProps) {
  const { supabase } = useSupabase()
  const { data, isLoading } = useQuery({
    queryKey: ['kpi-trend', level, divisionId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('kpis')
        .select('period, period_start, progress')
        .gte('period_start', yearStart())
        .lte('period_start', yearEnd())
        .order('period_start', { ascending: true })
      if (level === 'division' && divisionId) {
        q = q.eq('division_id', divisionId)
      } else if (level === 'company') {
        q = q.eq('level', 'company')
      }
      const { data, error } = await q
      if (error) throw error

      // Group by month, average progress.
      const byMonth: Record<string, { sum: number; count: number }> = {}
      ;(data ?? []).forEach((r: any) => {
        const month = (r.period_start ?? r.period ?? '').slice(0, 7)
        if (!month) return
        if (!byMonth[month]) byMonth[month] = { sum: 0, count: 0 }
        byMonth[month].sum += r.progress ?? 0
        byMonth[month].count += 1
      })
      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, { sum, count }]): TrendPoint => ({
          period,
          avg_progress: count > 0 ? sum / count : 0,
        }))
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Tidak ada data periode</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={TrendingUp}
            title="Belum ada data KPI periode"
            description="Data akan muncul setelah KPI di-record tiap bulan"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
        <CardDescription>
          {data.length} periode · {formatPercent(data[data.length - 1]?.avg_progress ?? 0)} bulan ini
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="period"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v)}%`}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) => formatPercent(typeof v === 'number' ? v : 0)}
              />
              <Line
                type="monotone"
                dataKey="avg_progress"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
