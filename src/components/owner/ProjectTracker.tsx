// components/owner/ProjectTracker.tsx
// Construction projects tracker with budget variance and timeline.

import { Hammer, Calendar, TrendingUp, TrendingDown } from 'lucide-react'

interface Project {
  id: string
  code: string
  name: string
  total_units: number
  units_completed: number
  start_date: string
  target_completion_date: string
  budget_rupiah: number
  spent_rupiah: number
  status: string
}

function formatRupiah(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}M`
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}jt`
  return String(n)
}

export function ProjectTracker({ projects, totalBudget, totalSpent, budgetVariance }: {
  projects: Project[]
  totalBudget: number
  totalSpent: number
  budgetVariance: number
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-8 text-center">
        <Hammer className="h-8 w-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Belum ada proyek. Jalankan migration 011 untuk lihat progres pembangunan.
        </p>
      </div>
    )
  }

  const isOverBudget = budgetVariance > 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card">
          <div className="card-body">
            <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider">Total Budget</p>
            <p className="font-heading text-2xl font-bold tabular-nums mt-1">Rp {formatRupiah(totalBudget)}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider">Total Spent</p>
            <p className="font-heading text-2xl font-bold tabular-nums mt-1">Rp {formatRupiah(totalSpent)}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider">Variance</p>
            <p className={`font-heading text-2xl font-bold tabular-nums mt-1 flex items-center gap-1 ${isOverBudget ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
              {isOverBudget ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {budgetVariance > 0 ? '+' : ''}{budgetVariance.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider">Unit Selesai</p>
            <p className="font-heading text-2xl font-bold tabular-nums mt-1">
              {projects.reduce((s, p) => s + p.units_completed, 0)}/
              {projects.reduce((s, p) => s + p.total_units, 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto"><table className="data-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Timeline</th>
              <th className="text-right">Budget</th>
              <th className="text-right">Spent</th>
              <th className="text-right">Progress</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const progress = p.total_units > 0 ? Math.round((p.units_completed / p.total_units) * 100) : 0
              const spentPct = p.budget_rupiah > 0 ? (p.spent_rupiah / p.budget_rupiah) * 100 : 0
              const overBudget = spentPct > 100
              return (
                <tr key={p.id}>
                  <td>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)] font-mono">{p.code}</p>
                  </td>
                  <td>
                    <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {p.start_date} → {p.target_completion_date}
                    </p>
                  </td>
                  <td className="text-right font-mono text-xs">Rp {formatRupiah(p.budget_rupiah)}</td>
                  <td className={`text-right font-mono text-xs ${overBudget ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]'}`}>
                    Rp {formatRupiah(p.spent_rupiah)}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono text-xs">{progress}%</span>
                      <div className="w-16 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-brand-500)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="pill" data-variant={p.status === 'in_progress' ? 'info' : p.status === 'completed' ? 'success' : 'neutral'}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
