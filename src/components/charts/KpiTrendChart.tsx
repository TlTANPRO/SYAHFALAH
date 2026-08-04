// components/charts/KpiTrendChart.tsx
// Wrapper untuk trend chart KPI. Dipakai di owner page.

'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TrendPoint {
  label: string
  [kpiCode: string]: string | number | null
}

const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6']

export function KpiTrendChart({ data, series, height = 280 }: {
  data: TrendPoint[]
  series: { code: string; name: string }[]
  height?: number
}) {
  if (!data || data.length === 0 || series.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-12 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">Belum ada data trend. Data 12 bulan terakhir belum tersedia.</p>
      </div>
    )
  }
  return (
    <div className="card">
      <div className="card-body">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
            <XAxis dataKey="label" stroke="var(--color-text-tertiary)" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--color-text-tertiary)" tick={{ fontSize: 11 }} unit="%" domain={[0, 120]} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: 'var(--color-text-secondary)' }}
              formatter={(value: any) => `${Number(value).toFixed(0)}%`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {series.map((s, i) => (
              <Line
                key={s.code}
                type="monotone"
                dataKey={s.code}
                name={s.name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
