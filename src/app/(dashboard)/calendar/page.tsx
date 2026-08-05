// src/app/(dashboard)/calendar/page.tsx
// Ritme kerja Syahfalah per program kerja:
// - Daily standup (kecuali Jumat, Mada)
// - Weekly Senin 09.00 (40 menit)
// - Monthly akhir bulan (2 jam)
// - Quarterly planning & quarterly review
// - Annual planning ogni Januari

import { CalendarDays, Clock, MapPin, Users } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

interface Ritual {
  nama: string
  kadarsa: string  // 'Harian', 'Mingguan', 'Bulanan', 'Kuartalan', 'Tahunan'
  hari: string
  jam: string
  durasi: string
  peserta: string
  tempat: string
  agenda: string
}

const RITUAL: Ritual[] = [
  {
    nama: 'Daily Standup',
    kadarsa: 'Harian',
    hari: 'Senin – Kamis',
    jam: '08.30',
    durasi: '15 menit',
    peserta: 'Seluruh tim (wajib)',
    tempat: 'Ruang meeting lantai 1',
    agenda: '3 hal semalam, 3 hal hari ini, blocker, dan update WA group.',
  },
  {
    nama: 'Weekly Standup',
    kadarsa: 'Mingguan',
    hari: 'Senin',
    jam: '09.00',
    durasi: '40 menit',
    peserta: 'Seluruh tim + Owner',
    tempat: 'Ruang meeting besar',
    agenda: 'Review KPI minggu lalu, target minggu ini, dan demo progress tiap divisi.',
  },
  {
    nama: 'Friday Reflection',
    kadarsa: 'Mingguan',
    hari: 'Jumat',
    jam: '16.00',
    durasi: '30 menit',
    peserta: 'Seluruh tim (sukarela)',
    tempat: 'Ruang meeting besar',
    agenda: 'Refleksi mingguan, apresiasi, sharing insight dari training atau buku.',
  },
  {
    nama: 'Monthly Review',
    kadarsa: 'Bulanan',
    hari: 'Akhir bulan, hari terakhir kerja',
    jam: '13.00',
    durasi: '2 jam',
    peserta: 'Seluruh tim + Owner',
    tempat: 'Ruang meeting besar',
    agenda: 'Presentasi KPI bulanan tiap divisi, hitung reward, bahas blocker besar.',
  },
  {
    nama: 'Quarterly Planning',
    kadarsa: 'Kuartalan',
    hari: 'Minggu pertama Maret, Juni, September, Desember',
    jam: '09.00',
    durasi: '4 jam',
    peserta: 'Owner + Kepala Kantor + PIC Divisi',
    tempat: 'Off-site (villa luar kota)',
    agenda: 'Rencanakan 90 hari ke depan, alokasi budget, dan strategi cluster baru.',
  },
  {
    nama: 'Quarterly Review',
    kadarsa: 'Kuartalan',
    hari: 'Minggu kedua April, Juli, Oktober, Januari',
    jam: '09.00',
    durasi: '3 jam',
    peserta: 'Owner + Kepala Kantor + PIC Divisi',
    tempat: 'Ruang meeting besar',
    agenda: 'Evaluasi pencapaian quarter lalu, gap analysis, dan action plan.',
  },
  {
    nama: 'Annual Strategic Review',
    kadarsa: 'Tahunan',
    hari: 'Minggu ketiga Januari',
    jam: '08.00',
    durasi: '8 jam (full day)',
    peserta: 'Owner + Kepala Kantor + semua PIC',
    tempat: 'Hotel/konferensi',
    agenda: 'Review tahun lalu, set target tahun baru, ekspansi cluster, budget tahunan.',
  },
]

const KADARSA_COLOR: Record<string, string> = {
  'Harian': 'bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30',
  'Mingguan': 'bg-[var(--color-info)]/15 text-[var(--color-info)] border-[var(--color-info)]/30',
  'Bulanan': 'bg-[var(--color-brand-500)]/15 text-[var(--color-brand-500)] border-[var(--color-brand-500)]/30',
  'Kuartalan': 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-[var(--color-warning)]/30',
  'Tahunan': 'bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30',
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function matchesToday(r: Ritual, todayIdx: number): boolean {
  const lower = r.hari.toLowerCase()
  if (r.kadarsa === 'Harian') {
    // Harian berlaku Senin–Kamis, skip weekend
    if (todayIdx === 0 || todayIdx === 6) return false
    return lower.includes(DAY_NAMES[todayIdx].toLowerCase())
  }
  if (r.kadarsa === 'Mingguan') {
    const ritualIdx = DAY_NAMES.findIndex(d => lower.includes(d.toLowerCase()))
    return ritualIdx === todayIdx
  }
  return false
}

export default function Page() {
  const grouped = RITUAL.reduce<Record<string, Ritual[]>>((acc, r) => {
    (acc[r.kadarsa] = acc[r.kadarsa] || []).push(r)
    return acc
  }, {})
  const order = ['Harian', 'Mingguan', 'Bulanan', 'Kuartalan', 'Tahunan']

  const today = new Date()
  const dayOfWeek = today.getDay()
  const todayName = DAY_NAMES[dayOfWeek]
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  const nextMeeting = isWeekend
    ? 'Senin 09.00 — Weekly Standup'
    : dayOfWeek === 5
    ? 'Senin 09.00 — Weekly Standup'
    : 'Besok 08.30 — Daily Standup'

  const todaysRituals = RITUAL.filter(r => matchesToday(r, dayOfWeek))

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Breadcrumbs crumbs={[{ label: 'Ritme kerja' }]} />
        <h1 className="display-lg">Ritme kerja</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Meeting yang sudah dijadwalkan dan harus diikuti semua tim.
        </p>
      </div>

      <div className="card kpi-tile">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Meeting berikutnya</p>
            <p className="font-heading text-xl font-semibold">{nextMeeting}</p>
          </div>
          <CalendarDays className="h-8 w-8 text-[var(--color-brand-500)]" />
        </div>
      </div>

      {todaysRituals.length > 0 && (
        <div className="rounded-lg border border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-brand-500)] text-[var(--color-text-inverse)]">
              Hari ini · {todayName}
            </span>
            <p className="text-sm font-medium">
              {todaysRituals.length} agenda untuk hari ini
            </p>
          </div>
          <ul className="space-y-1">
            {todaysRituals.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <Clock className="h-3.5 w-3.5 text-[var(--color-brand-500)]" />
                <span className="font-mono">{r.jam}</span>
                <span>·</span>
                <span>{r.nama}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {order.map(k => {
        const items = grouped[k] || []
        if (items.length === 0) return null
        return (
          <div key={k} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${KADARSA_COLOR[k]}`}>
                {k}
              </span>
              <h2 className="display-sm">{k === 'Kuartalan' ? 'Quarterly' : k === 'Bulanan' ? 'Monthly' : k}</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {items.map((r, i) => {
                const isToday = todaysRituals.some(t => t.nama === r.nama)
                return (
                  <div key={i} className={`card card-hover ${isToday ? 'ring-2 ring-[var(--color-brand-500)]/40' : ''}`}>
                    <div className="card-body">
                      {isToday && (
                        <div className="flex items-center gap-1 text-xs text-[var(--color-brand-500)] font-medium mb-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-brand-500)]" />
                          Hari ini
                        </div>
                      )}
                      <h3 className="font-heading text-base font-semibold mb-3">{r.nama}</h3>
                      <div className="space-y-2 mb-3">
                        <div className="flex items-start gap-2 text-sm">
                          <CalendarDays className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] mt-0.5 flex-shrink-0" />
                          <span className="text-[var(--color-text-secondary)]">{r.hari}, {r.jam}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <Clock className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] mt-0.5 flex-shrink-0" />
                          <span className="text-[var(--color-text-secondary)]">{r.durasi}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <Users className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] mt-0.5 flex-shrink-0" />
                          <span className="text-[var(--color-text-secondary)]">{r.peserta}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] mt-0.5 flex-shrink-0" />
                          <span className="text-[var(--color-text-secondary)]">{r.tempat}</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-[var(--color-border-subtle)]">
                        <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Agenda</p>
                        <p className="text-sm text-[var(--color-text-primary)]">{r.agenda}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}