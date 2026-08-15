// src/components/manager/TeamGrid.tsx
// Manager control surface: 12 staff grouped by 6 division clusters.
// Each cell shows staff status (active today, pending tasks, overdue).
// Server Component — fetches via service role filtered by role/scope.

import { createClient } from '@supabase/supabase-js'
import { UserCircle2, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'

export interface TeamMember {
  id: string
  full_name: string
  role: string
  position: string | null
  division_id: string | null
  is_active: boolean
  last_login_at: string | null
}

export interface Division {
  id: string
  name: string
  code: string
}

export interface StaffStat {
  user_id: string
  pending: number
  overdue: number
  done_today: number
}

interface TeamGridProps {
  members: TeamMember[]
  divisions: Division[]
  stats: Record<string, StaffStat>
  scope?: 'all' | 'division'
}

export function TeamGrid({ members, divisions, stats, scope = 'all' }: TeamGridProps) {
  // Group members by division
  const byDivision = new Map<string, TeamMember[]>()
  for (const m of members) {
    const key = m.division_id ?? 'unassigned'
    if (!byDivision.has(key)) byDivision.set(key, [])
    byDivision.get(key)!.push(m)
  }

  // Stable division order: head/owner first, then by code
  const orderedDivisions = divisions
    .filter((d) => byDivision.has(d.id))
    .sort((a, b) => a.code.localeCompare(b.code))

  if (scope === 'all') {
    // Add unassigned bucket if present
    const unassigned = byDivision.get('unassigned')
    if (unassigned && unassigned.length > 0) {
      orderedDivisions.push({
        id: 'unassigned',
        code: 'NONE',
        name: 'Tanpa Divisi',
      })
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="eyebrow eyebrow-brand">Team Grid</p>
          <h2 className="font-heading text-xl font-semibold">
            {members.length} staff · {orderedDivisions.length} divisi
          </h2>
        </div>
        <span className="pill" data-variant="neutral">
          {members.filter((m) => m.is_active).length} aktif
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {orderedDivisions.map((div) => {
          const list = byDivision.get(div.id) ?? []
          return (
            <article key={div.id} className="card overflow-hidden">
              <header className="px-4 py-3 border-b border-[var(--color-border-default)] flex items-baseline justify-between">
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">
                    {div.code}
                  </p>
                  <h3 className="font-heading text-base font-semibold">{div.name}</h3>
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {list.length} orang
                </span>
              </header>
              <ul className="divide-y divide-[var(--color-border-default)]">
                {list.map((m) => {
                  const s = stats[m.id] ?? { pending: 0, overdue: 0, done_today: 0, user_id: m.id }
                  const status: 'overdue' | 'pending' | 'active' | 'idle' =
                    s.overdue > 0
                      ? 'overdue'
                      : s.pending > 0
                        ? 'pending'
                        : s.done_today > 0
                          ? 'active'
                          : 'idle'
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/personal/${m.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)]/40 transition-colors"
                      >
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium ${status === 'overdue'
                              ? 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]'
                              : status === 'pending'
                                ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
                                : status === 'active'
                                  ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'
                            }`}
                          aria-hidden="true"
                        >
                          {m.full_name.slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{m.full_name}</p>
                          <p className="text-xs text-[var(--color-text-secondary)] truncate">
                            {m.position ?? m.role}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {s.overdue > 0 && (
                            <span
                              className="inline-flex items-center gap-1 text-[var(--color-danger)]"
                              title={`${s.overdue} overdue`}
                            >
                              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              {s.overdue}
                            </span>
                          )}
                          {s.pending > 0 && (
                            <span
                              className="inline-flex items-center gap-1 text-[var(--color-warning)]"
                              title={`${s.pending} pending`}
                            >
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              {s.pending}
                            </span>
                          )}
                          {s.done_today > 0 && (
                            <span
                              className="inline-flex items-center gap-1 text-[var(--color-success)]"
                              title={`${s.done_today} done today`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              {s.done_today}
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                })}
                {list.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
                    Belum ada anggota
                  </li>
                )}
              </ul>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export async function loadTeamData(sb: any, scope?: { divisionId?: string }) {
  let userQ = sb
    .from('users')
    .select('id, full_name, role, position, division_id, is_active, last_login_at')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true })
  if (scope?.divisionId) userQ = userQ.eq('division_id', scope.divisionId)
  const { data: usersRaw } = await userQ
  const members = (usersRaw ?? []) as TeamMember[]

  const { data: divsRaw } = await sb
    .from('divisions')
    .select('id, name, code')
    .order('code', { ascending: true })
  const divisions = (divsRaw ?? []) as Division[]

  // Aggregate per-user task stats
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000)
  const todayIso = todayStart.toISOString()
  const tomorrowIso = tomorrowStart.toISOString()

  const userIds = members.map((m) => m.id)
  if (userIds.length === 0) return { members, divisions, stats: {} as Record<string, StaffStat> }

  const { data: tasksRaw } = await sb
    .from('tasks')
    .select('user_id, status, completed_at, due_date')
    .in('user_id', userIds)
  const tasks = (tasksRaw ?? []) as Array<{
    user_id: string
    status: string
    completed_at: string | null
    due_date: string | null
  }>

  const stats: Record<string, StaffStat> = {}
  for (const m of members) {
    stats[m.id] = { user_id: m.id, pending: 0, overdue: 0, done_today: 0 }
  }
  for (const t of tasks) {
    const s = stats[t.user_id]
    if (!s) continue
    if (t.status === 'done') {
      if (t.completed_at && t.completed_at >= todayIso && t.completed_at < tomorrowIso) {
        s.done_today++
      }
    } else if (t.status !== 'cancelled') {
      s.pending++
      if (t.due_date && t.due_date < todayIso.slice(0, 10)) {
        s.overdue++
      }
    }
  }
  return { members, divisions, stats }
}
