// src/app/(dashboard)/raci/page.tsx
// Matriks RACI untuk SOW PT Syahfalah Global.
// R = Responsible (eksekusi), A = Accountable (pemilik hasil),
// C = Consulted (dimintai pendapat), I = Informed (hanya tahu).
// Data hardcode berdasarkan program kerja karena tabel SOW belum
// punya relasi RACI eksplisit.

import { CheckCircle2, Circle, Eye, MessageSquare, AlertTriangle } from 'lucide-react'

interface RACIRow {
  task: string
  pic: string
  owner: string
  konsultan: string
  hukum: string
  media: string
  finance: string
  konstruksi: string
  notes: string
}

const ROLES = [
  { key: 'pic',       label: 'Marketing' },
  { key: 'owner',     label: 'Owner' },
  { key: 'konsultan', label: 'KK' },
  { key: 'hukum',     label: 'Legal' },
  { key: 'media',     label: 'Media' },
  { key: 'finance',   label: 'Finance' },
  { key: 'konstruksi',label: 'Konstruksi' },
] as const

const RACI: RACIRow[] = [
  { task: 'Cari leads dari Meta & TikTok Ads',     pic: 'R', owner: 'A', konsultan: 'I', hukum: '—',   media: 'C', finance: 'I', konstruksi: '—', notes: 'Target 200 leads/bulan untuk Riza' },
  { task: 'Hubungi calon buyer',                    pic: 'R', owner: 'A', konsultan: 'C', hukum: '—',   media: '—',  finance: '—', konstruksi: '—', notes: 'Response time max 2 jam' },
  { task: 'Booking & jadwal survey',                pic: 'R', owner: 'A', konsultan: 'I', hukum: '—',   media: '—',  finance: '—', konstruksi: 'I', notes: 'Survey oleh Amir/Yudi' },
  { task: 'Proses berkas (KK, KTP, NPWP, dll)',    pic: 'C', owner: 'A', konsultan: 'R', hukum: 'C',  media: '—',  finance: 'I', konstruksi: '—', notes: 'Novita kumpulkan' },
  { task: 'Submit berkas ke bank untuk SP3K',       pic: 'C', owner: 'A', konsultan: 'R', hukum: 'C',  media: '—',  finance: 'I', konstruksi: '—', notes: 'Max 14 hari proses' },
  { task: 'Penjadwalan akad',                       pic: 'I', owner: 'A', konsultan: 'R', hukum: 'R',  media: '—',  finance: 'I', konstruksi: '—', notes: 'Bu Nisya buat akta' },
  { task: 'Pembangunan unit rumah',                 pic: 'I', owner: 'A', konsultan: 'I', hukum: '—',   media: '—',  finance: 'C', konstruksi: 'R', notes: 'Rizal lead, Andi kontrol' },
  { task: 'Serah terima (BAST)',                    pic: 'I', owner: 'A', konsultan: 'I', hukum: 'C',  media: '—',  finance: 'I', konstruksi: 'R', notes: 'Foto dokumentasi' },
  { task: 'Balik nama SHM',                         pic: 'I', owner: 'A', konsultan: 'I', hukum: 'R',  media: '—',  finance: 'I', konstruksi: '—', notes: 'Bu Nisya urus BPN' },
  { task: 'Buat konten land & cluster',             pic: 'C', owner: 'A', konsultan: 'I', hukum: '—',   media: 'R',  finance: '—', konstruksi: '—', notes: 'Reni, Rifki, Reta' },
  { task: 'Hitung fee marketing (closing)',          pic: 'C', owner: 'A', konsultan: 'I', hukum: '—',   media: '—',  finance: 'R', konstruksi: '—', notes: 'Rp 500k/unit, Novita transfer' },
  { task: 'Klaim garansi unit',                     pic: 'I', owner: 'A', konsultan: 'C', hukum: 'C',  media: '—',  finance: 'I', konstruksi: 'R', notes: 'Rizal + Andi cek' },
  { task: 'Weekly standup (Senin 09.00)',           pic: 'R', owner: 'A', konsultan: 'R', hukum: 'C',  media: 'R',  finance: 'R', konstruksi: 'R', notes: '40 menit, run by Mada' },
  { task: 'Monthly review (akhir bulan)',           pic: 'R', owner: 'A', konsultan: 'R', hukum: 'R',  media: 'R',  finance: 'R', konstruksi: 'R', notes: '2 jam, presentasi KPI' },
]

function badgeOf(role: string): { bg: string; icon: any } {
  if (role === 'R') return { bg: 'bg-[var(--color-brand-500)]/15 text-[var(--color-brand-500)] border border-[var(--color-brand-500)]/30', icon: CheckCircle2 }
  if (role === 'A') return { bg: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/30', icon: AlertTriangle }
  if (role === 'C') return { bg: 'bg-[var(--color-info)]/15 text-[var(--color-info)] border border-[var(--color-info)]/30', icon: MessageSquare }
  if (role === 'I') return { bg: 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]', icon: Eye }
  return { bg: 'text-[var(--color-text-tertiary)]', icon: Circle }
}

function countCoverage(rows: RACIRow[], key: string) {
  return rows.filter(r => (r as any)[key] === 'R' || (r as any)[key] === 'A').length
}

export default function Page() {
  // Sanity check: setiap task harus punya minimal 1 R dan 1 A
  const noResponsible = RACI.filter(r => !ROLES.some(role => (r as any)[role.key] === 'R'))
  const noAccountable = RACI.filter(r => !ROLES.some(role => (r as any)[role.key] === 'A'))

  return (
    <div className="space-y-6">
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
            Beberapa aktivitas belum punya R (Responsible): {noResponsible.map(r => r.task).join(', ')}
          </p>
        </div>
      )}
      {noAccountable.length > 0 && (
        <div className="rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-[var(--color-danger)] mt-0.5" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Beberapa aktivitas belum punya A (Accountable): {noAccountable.map(r => r.task).join(', ')}
          </p>
        </div>
      )}

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
              {RACI.map((row, i) => (
                <tr key={i}>
                  <td className="max-w-md">
                    <p className="text-sm font-medium">{row.task}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{row.notes}</p>
                  </td>
                  {ROLES.map(role => {
                    const value = (row as any)[role.key]
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

      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        {ROLES.map(r => {
          const tasks = countCoverage(RACI, r.key)
          return (
            <div key={r.key} className="card">
              <div className="card-body p-3">
                <p className="text-xs text-[var(--color-text-tertiary)]">{r.label}</p>
                <p className="font-mono text-xl font-bold tabular-nums">{tasks}</p>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">task dilibatkan</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
