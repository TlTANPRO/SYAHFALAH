// src/app/(dashboard)/kepala-kantor/planning/page.tsx
// Halaman planning kepala kantor. Tampilan 1 kuartal ke depan
// dan checklist hal yang harus di-prioritaskan.

import { Target, CheckCircle2, AlertTriangle } from 'lucide-react'

interface QuarterGoal {
  divisi: string
  pic: string
  target: string
  kenapa: string
  status: 'belum mulai' | 'jalan' | 'selesai'
  deadline: string
}

const Q3_2026: QuarterGoal[] = [
  {
    divisi: 'Marketing',
    pic: 'Riza',
    target: 'Closing 18 unit',
    kenapa: 'Pipeline saat ini 6 calon di stage sp3k & closing, target 3 closing/bulan selama Q3.',
    status: 'jalan',
    deadline: '30 Sep 2026',
  },
  {
    divisi: 'Marketing',
    pic: 'Yudi',
    target: 'Survey 30 unit',
    kenapa: 'Konversi historis 1 closing per 5 survey, perlu 30 survey untuk support 6 closing.',
    status: 'jalan',
    deadline: '15 Sep 2026',
  },
  {
    divisi: 'Konstruksi',
    pic: 'Rizal',
    target: 'Selesaikan 60 unit BSA Tahap 2',
    kenapa: 'Target BAST ke buyer cluster BSA sudah jatuh tempo 30 Aug 2026.',
    status: 'belum mulai',
    deadline: '30 Aug 2026',
  },
  {
    divisi: 'Konstruksi',
    pic: 'Andi',
    target: 'Klaim garansi 0 backlog',
    kenapa: 'Ada 5 unit dengan klaim pending dari Mei 2026, perlu di-clear agar NPS Q3.',
    status: 'belum mulai',
    deadline: '31 Aug 2026',
  },
  {
    divisi: 'Media',
    pic: 'Reni',
    target: 'Engagement IG naik 25%',
    kenapa: 'Engagement saat ini 3.4%, target industri developer 4.5%.',
    status: 'jalan',
    deadline: '30 Sep 2026',
  },
  {
    divisi: 'Keuangan',
    pic: 'Novita',
    target: 'SP3K on-time 95%',
    kenapa: 'SP3K currently 86% on-time, drop utama di tahap berkas.',
    status: 'jalan',
    deadline: '30 Sep 2026',
  },
  {
    divisi: 'Purchasing',
    pic: 'Sinta',
    target: 'Diskon material 8%',
    kenapa: 'Vendor saat ini mark-up 12%, negosiasi sudah dimulai sejak Q2.',
    status: 'belum mulai',
    deadline: '15 Sep 2026',
  },
  {
    divisi: 'Legal',
    pic: 'Bu Nisya',
    target: 'SHM 100% keluar dalam 90 hari',
    kenapa: 'Rata-rata saat ini 120 hari dari BAST, perlu push biar customer puas.',
    status: 'jalan',
    deadline: '30 Sep 2026',
  },
]

const STATUS_VARIANT: Record<QuarterGoal['status'], string> = {
  'belum mulai': 'neutral',
  'jalan': 'warning',
  'selesai': 'success',
}

const STATUS_ICON: Record<QuarterGoal['status'], typeof Target> = {
  'belum mulai': AlertTriangle,
  'jalan': Target,
  'selesai': CheckCircle2,
}

export default function Page() {
  const total = Q3_2026.length
  const selesai = Q3_2026.filter(q => q.status === 'selesai').length
  const jalan = Q3_2026.filter(q => q.status === 'jalan').length
  const belum = Q3_2026.filter(q => q.status === 'belum mulai').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg">Planning Q3 2026</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Target divisi untuk Juli – September 2026. Review tiap akhir bulan.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="card">
          <div className="card-body p-3"><p className="text-xs text-[var(--color-text-tertiary)]">Total target</p><p className="font-mono text-2xl font-bold tabular-nums">{total}</p></div>
        </div>
        <div className="card">
          <div className="card-body p-3"><p className="text-xs text-[var(--color-text-tertiary)]">Selesai</p><p className="font-mono text-2xl font-bold tabular-nums text-[var(--color-success)]">{selesai}</p></div>
        </div>
        <div className="card">
          <div className="card-body p-3"><p className="text-xs text-[var(--color-text-tertiary)]">Jalan</p><p className="font-mono text-2xl font-bold tabular-nums text-[var(--color-warning)]">{jalan}</p></div>
        </div>
        <div className="card">
          <div className="card-body p-3"><p className="text-xs text-[var(--color-text-tertiary)]">Belum mulai</p><p className="font-mono text-2xl font-bold tabular-nums text-[var(--color-text-tertiary)]">{belum}</p></div>
        </div>
      </div>

      <div className="space-y-3">
        {Q3_2026.map((q, i) => {
          const Icon = STATUS_ICON[q.status]
          return (
            <div key={i} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-heading text-base font-semibold">{q.target}</p>
                      <span className="pill" data-variant={STATUS_VARIANT[q.status]}>
                        <Icon className="h-3 w-3" />
                        {q.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      {q.divisi} · PIC {q.pic} · Deadline {q.deadline}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">{q.kenapa}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
