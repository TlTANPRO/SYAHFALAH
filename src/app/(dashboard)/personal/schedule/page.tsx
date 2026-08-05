// src/app/(dashboard)/personal/schedule/page.tsx
// Jadwal harian + mingguan + task user minggu ini.

import { CalendarDays, Clock } from 'lucide-react'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { createClient } from '@supabase/supabase-js'
import { EmptyState } from '@/components/ui/empty-state'

const FALLBACK_SECRET = 'dev-only-fallback-key-for-local-development-min-32-chars'

async function getCurrentUser() {
  const c = await cookies()
  const token = c.get('syahfalah-access')?.value
  if (!token) return null
  try {
    const secret = process.env.JWT_SECRET || FALLBACK_SECRET
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return { id: payload.sub as string, name: (payload as any).name, role: (payload as any).role, position: (payload as any).position }
  } catch {
    return null
  }
}

const RITME_HARIAN = [
  { jam: '08.30', acara: 'Daily standup', tempat: 'Ruang meeting' },
  { jam: '12.00', acara: 'ISHOMA', tempat: '-' },
  { jam: '17.00', acara: 'Submit laporan harian', tempat: 'WA group' },
]

const RITME_MINGGUAN = [
  { hari: 'Senin', acara: 'Weekly standup 09.00 (40 menit)', tempat: 'Ruang besar' },
  { hari: 'Selasa', acara: 'Site visit', tempat: 'Cluster' },
  { hari: 'Rabu', acara: 'Content review dengan tim media', tempat: 'Ruang media' },
  { hari: 'Kamis', acara: 'Follow up SP3K', tempat: 'Kantor' },
  { hari: 'Jumat', acara: 'Friday reflection 16.00', tempat: 'Ruang besar' },
]

async function loadUserTasks(userId: string, weekStart: string, weekEnd: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  try {
    const { data } = await sb
      .from('tasks')
      .select('id, title, due_date, priority, status')
      .eq('assignee_id', userId)
      .gte('due_date', weekStart)
      .lte('due_date', weekEnd)
      .order('due_date', { ascending: true })
      .limit(20)
    return (data ?? []) as any[]
  } catch {
    return []
  }
}

function getWeekRange(): { start: string; end: string } {
  const today = new Date()
  const day = today.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

export default async function Page() {
  const user = await getCurrentUser()
  const { start, end } = getWeekRange()
  const tasks = user ? await loadUserTasks(user.id, start, end) : []
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const taskByDate = new Map<string, any[]>()
  for (const t of tasks) {
    const list = taskByDate.get(t.due_date) || []
    list.push(t)
    taskByDate.set(t.due_date, list)
  }

  const thisWeek = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg">My Schedule</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Hari ini: {today}. Minggu ini: {start} – {end}.
        </p>
      </div>

      <div>
        <h2 className="display-md">Ritme harian</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">3 acara rutin yang harus konsisten tiap hari kerja.</p>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto"><table className="data-table">
          <thead>
            <tr>
              <th className="w-24">Jam</th>
              <th>Acara</th>
              <th>Tempat</th>
            </tr>
          </thead>
          <tbody>
            {RITME_HARIAN.map((r, i) => (
              <tr key={i}>
                <td className="font-mono text-sm font-semibold">{r.jam}</td>
                <td>{r.acara}</td>
                <td className="text-sm text-[var(--color-text-secondary)]">{r.tempat}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <div>
        <h2 className="display-md">Ritme mingguan</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Acara tetap yang tampil di kalender tiap minggu.</p>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto"><table className="data-table">
          <thead>
            <tr>
              <th className="w-24">Hari</th>
              <th>Acara</th>
              <th>Tempat</th>
            </tr>
          </thead>
          <tbody>
            {RITME_MINGGUAN.map((r, i) => (
              <tr key={i}>
                <td className="font-mono text-sm font-semibold">{r.hari}</td>
                <td>{r.acara}</td>
                <td className="text-sm text-[var(--color-text-secondary)]">{r.tempat}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <div>
        <h2 className="display-md">Task minggu ini</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {tasks.length > 0 ? `${tasks.length} task dengan due date minggu ini.` : 'Belum ada task jatuh tempo minggu ini.'}
        </p>
      </div>
      {tasks.length === 0 ? (
        <EmptyState
        title="Tidak ada jadwal"
        description="Tugas baru akan muncul di kalender berdasarkan plan tim Anda."
      />
      ) : (
        <div className="space-y-3">
          {thisWeek.map((date) => {
            const dayTasks = taskByDate.get(date) || []
            if (dayTasks.length === 0) return null
            const dayLabel = new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })
            return (
              <div key={date} className="card">
                <div className="card-body">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="font-heading text-base font-semibold">{dayLabel}</p>
                    <span className="text-xs text-[var(--color-text-tertiary)] font-mono">{date}</span>
                    <span className="pill" data-variant="info">{dayTasks.length} task</span>
                  </div>
                  <ul className="space-y-2">
                    {dayTasks.map(t => (
                      <li key={t.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-[var(--color-surface-2)]">
                        <Clock className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{t.title}</p>
                          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                            Priority: {t.priority || 'normal'} · Status: {t.status || 'pending'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
