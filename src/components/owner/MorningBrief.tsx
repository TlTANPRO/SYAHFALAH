// src/components/owner/MorningBrief.tsx
// Auto-update daily executive brief. Daily variance logic:
// - today: tasks completed / new leads / pending approvals
// - week: pipeline movement / overdue SP3K
// - now: action items (top 3)
//
// Auto-update: parent page sets `export const dynamic = 'force-dynamic'`
// and `revalidate = 0` so this re-renders on every request. Daily cadence
// is achieved via the connection's request time (no client-side clock).

import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

interface BriefProps {
  today: string
  /** angka-angka dari server */
  completedTasks: number      // tasks.completed_at today
  pendingTasks: number         // tasks.status != done and due today/overdue
  newLeads: number             // leads.created_at today
  pendingApprovals: number     // approvals.status = 'pending'
  overdueSp3k: number          // consumer_cases.is_overdue
  pipelineValue: number        // sum of leads.estimated_value_rupiah
  topActionItems: { label: string; href: string; tone?: 'default' | 'warning' | 'success' }[]
  /** opsional */
  weekTrend?: { leads: number; tasks: number }
}

export function MorningBrief(p: BriefProps) {
  const hasMovement =
    p.completedTasks > 0 || p.newLeads > 0 || p.pendingTasks > 0 || p.pendingApprovals > 0

  return (
    <section className="card overflow-hidden">
      <div className="card-body p-5 space-y-4">
        <header className="flex items-baseline justify-between gap-3">
          <div>
            <p className="eyebrow eyebrow-brand">Morning Brief</p>
            <h2 className="font-heading text-lg font-semibold">{p.today}</h2>
          </div>
          {!hasMovement && (
            <span className="pill" data-variant="neutral">Belum ada pergerakan</span>
          )}
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat
            label="Task selesai"
            value={p.completedTasks}
            icon={CheckCircle2}
            tone={p.completedTasks > 0 ? 'success' : 'neutral'}
          />
          <Stat
            label="Task belum selesai"
            value={p.pendingTasks}
            icon={Circle}
            tone={p.pendingTasks > 0 ? 'warning' : 'neutral'}
          />
          <Stat
            label="Lead baru"
            value={p.newLeads}
            icon={TrendingUp}
            tone={p.newLeads > 0 ? 'info' : 'neutral'}
          />
          <Stat
            label="Approval menunggu"
            value={p.pendingApprovals}
            icon={AlertTriangle}
            tone={p.pendingApprovals > 0 ? 'warning' : 'neutral'}
          />
        </div>

        {p.overdueSp3k > 0 && (
          <div className="flex items-start gap-2 px-3 py-2 rounded border-l-4 border-[var(--color-danger)] bg-[var(--color-danger)]/10">
            <AlertTriangle className="h-4 w-4 text-[var(--color-danger)] mt-0.5 shrink-0" aria-hidden />
            <p className="text-sm">
              <strong className="font-semibold">{p.overdueSp3k} SP3K lewat tempo.</strong>{' '}
              Cek <Link href="/owner" className="underline">berkas konsumen</Link>.
            </p>
          </div>
        )}

        {p.pipelineValue > 0 && (
          <p className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" aria-hidden />
            Pipeline aktif: <strong className="font-semibold text-[var(--color-text-secondary)] tabular-nums">
              Rp {(p.pipelineValue / 1e9).toFixed(1)}M
            </strong>
          </p>
        )}

        {p.topActionItems.length > 0 && (
          <div className="pt-3 border-t border-[var(--color-border-default)] space-y-2">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Top 3 kamu hari ini
            </p>
            <ol className="space-y-1.5">
              {p.topActionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-mono text-xs font-bold text-[var(--color-text-tertiary)] tabular-nums w-5 shrink-0">
                    {i + 1}.
                  </span>
                  <Link
                    href={item.href}
                    className="text-sm text-[var(--color-brand-500)] hover:underline flex items-center gap-1"
                  >
                    {item.label}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof CheckCircle2
  tone: 'success' | 'warning' | 'info' | 'neutral'
}) {
  const colorClass = {
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    info: 'text-[var(--color-info)]',
    neutral: 'text-[var(--color-text-tertiary)]',
  }[tone]
  const bgClass = {
    success: 'bg-[var(--color-success)]/10',
    warning: 'bg-[var(--color-warning)]/10',
    info: 'bg-[var(--color-info)]/10',
    neutral: 'bg-[var(--color-surface-2)]',
  }[tone]
  return (
    <div className={`p-3 rounded-lg ${bgClass}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--color-text-tertiary)]">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${colorClass}`} aria-hidden />
      </div>
      <p className={`font-heading text-2xl font-bold tabular-nums ${value === 0 ? 'text-[var(--color-text-tertiary)]' : ''}`}>
        {value}
      </p>
    </div>
  )
}
