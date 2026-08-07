// src/app/(dashboard)/raci/page.tsx
// Matriks RACI untuk SOW PT Syahfalah Global.
// R = Responsible (eksekusi), A = Accountable (pemilik hasil),
// C = Consulted (dimintai pendapat), I = Informed (hanya tahu).
// Previously hardcoded; now reads from public.raci_tasks + raci_assignments
// (migration 032). Admin can edit via Supabase SQL editor.

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { CheckCircle2, Circle, Eye, MessageSquare, AlertTriangle, ChevronRight } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

const ROLES = [
  { key: 'marketing',   label: 'Marketing' },
  { key: 'owner',       label: 'Owner' },
  { key: 'kk',          label: 'KK' },
  { key: 'legal',       label: 'Legal' },
  { key: 'media',       label: 'Media' },
  { key: 'finance',     label: 'Finance' },
  { key: 'konstruksi',  label: 'Konstruksi' },
] as const

type RoleKey = typeof ROLES[number]['key']
type RacValue = 'R' | 'A' | 'C' | 'I' | '—'

async function loadRaci() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { tasks: [], assignments: new Map<string, RacValue>() }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  try {
    const [tasksRes, assignsRes] = await Promise.all([
      sb.from('raci_tasks').select('id, task_name, notes, sort_order').eq('is_active', true).order('sort_order', { ascending: true }),
      sb.from('raci_assignments').select('raci_task_id, role, raci_value'),
    ])
    const tasks = (tasksRes.data ?? []) as any[]
    const assigns = (assignsRes.data ?? []) as any[]
    const map = new Map<string, RacValue>()
    for (const a of assigns) {
      map.set(`${a.raci_task_id}::${a.role}`, a.raci_value as RacValue)
    }
    return { tasks, assignments: map }
  } catch {
    return { tasks: [], assignments: new Map<string, RacValue>() }
  }
}

function badgeOf(value: string): { bg: string; icon: any } {
  if (value === 'R') return { bg: 'bg-[var(--color-brand-500)]/15 text-[var(--color-brand-500)] border border-[var(--color-brand-500)]/30', icon: CheckCircle2 }
  if (value === 'A') return { bg: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/30', icon: AlertTriangle }
  if (value === 'C') return { bg: 'bg-[var(--color-info)]/15 text-[var(--color-info)] border border-[var(--color-info)]/30', icon: MessageSquare }
  if (value === 'I') return { bg: 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]', icon: Eye }
  return { bg: 'text-[var(--color-text-tertiary)]', icon: Circle }
}

export default async function Page() {
  const { tasks, assignments } = await loadRaci()

  // Sanity checks: every task should have ≥1 R and 1 A.
  const noResponsible = tasks.filter(t => !ROLES.some(r => assignments.get(`${t.id}::${r.key}`) === 'R'))
  const noAccountable = tasks.filter(t => !ROLES.some(r => assignments.get(`${t.id}::${r.key}`) === 'A'))

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: 'Matriks RACI' }]} />
      <div>
        <h1 className="display-lg">Matriks RACI</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Siapa ngapain. R = eksekusi, A = pemilik hasil, C = dimintai pendapat, I = hanya tahu.
        </p>
      </div>

      {noResponsible.length > 0 && (
        <div className="rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-[var(--color-warning)] mt-0.5" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Beberapa aktivitas belum punya R (Responsible): {noResponsible.map(t => t.task_name).join(', ')}
          </p>
        </div>
      )}
      {noAccountable.length > 0 && (
        <div className="rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-[var(--color-danger)] mt-0.5" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Beberapa aktivitas belum punya A (Accountable): {noAccountable.map(t => t.task_name).join(', ')}
          </p>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="card p-6 text-center text-sm text-[var(--color-text-tertiary)]">
          Belum ada data RACI — admin bisa isi lewat Supabase table <code className="font-mono">raci_tasks</code> dan <code className="font-mono">raci_assignments</code>.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Aktivitas</th>
                  {ROLES.map(r => (
                    <th key={r.key} className="text-center">{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id}>
                    <td className="max-w-md">
                      <Link href="/sow" className="group inline-flex items-center gap-1 text-[var(--color-brand-500)] hover:underline">
                        <span className="text-sm font-medium">{t.task_name}</span>
                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      {t.notes && <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{t.notes}</p>}
                    </td>
                    {ROLES.map(role => {
                      const value = assignments.get(`${t.id}::${role.key}`) ?? '—'
                      const { bg, icon: Icon } = badgeOf(value)
                      return (
                        <td key={role.key} className="text-center">
                          {value !== '—' ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-semibold ${bg}`}>
                              <Icon className="h-3 w-3" />
                              {value}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        {ROLES.map(r => {
          let count = 0
          for (const t of tasks) {
            const v = assignments.get(`${t.id}::${r.key}`) ?? '—'
            if (v === 'R' || v === 'A') count++
          }
          return (
            <div key={r.key} className="card">
              <div className="card-body p-3">
                <p className="text-xs text-[var(--color-text-tertiary)]">{r.label}</p>
                <p className="font-mono text-xl font-bold tabular-nums">{count}</p>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">task dilibatkan</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
