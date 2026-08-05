// src/app/(dashboard)/kepala-kantor/coaching/page.tsx
// Log coaching 1-on-1 antara Kepala Kantor (Mada) dan tim.
// Template terstruktur: pembuka, blockers, follow-up, next step.

import { MessageCircle, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

interface CoachingEntry {
  tanggal: string
  nama: string
  posisi: string
  pembuka: string
  blockers: string
  follow_up: string
  next_step: string
  status: 'belum follow up' | 'selesai'
  jenis: 'rutin' | 'performa rendah' | 'pelanggaran'
}

const LOG: CoachingEntry[] = [
  {
    tanggal: '2026-08-01',
    nama: 'Yudi',
    posisi: 'Staff Marketing',
    pembuka: 'Cek progress survey dan apa yang bikin stuck akhir-akhir ini.',
    blockers: 'Susah follow up setelah SP3K, banyak buyer yang tiba-tiba batal.',
    follow_up: 'Buat script follow up SP3K H+3, H+7, H+14.',
    next_step: 'Lapor minggu depan',
    status: 'belum follow up',
    jenis: 'performa rendah',
  },
  {
    tanggal: '2026-07-28',
    nama: 'Amir',
    posisi: 'Staff Marketing',
    pembuka: 'Konfirmasi deadline laporan harian yang molor 3x.',
    blockers: 'Lagi bagi fokus dengan visit site di Klampokarum.',
    follow_up: 'Laporan harian harus masuk sebelum pukul 18.00, lewat 1x = coaching.',
    next_step: 'Lapor besok',
    status: 'selesai',
    jenis: 'pelanggaran',
  },
  {
    tanggal: '2026-07-22',
    nama: 'Rifki',
    posisi: 'Kreatif Media',
    pembuka: 'Check output konten Rabuan dan IG Reels series.',
    blockers: 'Antri approval brand guidelines dari Reni.',
    follow_up: 'Pakai template lama dulu, approval belakangan.',
    next_step: 'Deliver 4 Reels minggu ini',
    status: 'selesai',
    jenis: 'rutin',
  },
  {
    tanggal: '2026-07-15',
    nama: 'Riza',
    posisi: 'Marketing',
    pembuka: 'Review closing bulan Juni (6 closing) — di atas target.',
    blockers: 'Lead quality dari Meta Ads sedang turun, awal Agustus perlu refresh.',
    follow_up: 'Koordinir dengan Rifki untuk iklan baru.',
    next_step: 'Sesi lanjutan 2 minggu lagi',
    status: 'selesai',
    jenis: 'rutin',
  },
  {
    tanggal: '2026-07-10',
    nama: 'Sinta',
    posisi: 'Purchasing',
    pembuka: 'PO material Klampokarum delivered 4 hari terlambat.',
    blockers: 'Vendor utama switch supplier, harga naik 12%.',
    follow_up: 'Cari vendor alternatif, negosiasi frame contract.',
    next_step: 'Submit 3 vendor alternatif',
    status: 'belum follow up',
    jenis: 'pelanggaran',
  },
]

const JENIS_VARIANT: Record<CoachingEntry['jenis'], string> = {
  rutin: 'neutral',
  'performa rendah': 'warning',
  pelanggaran: 'danger',
}

export default function Page() {
  const belumFollowUp = LOG.filter(l => l.status === 'belum follow up').length
  const selesai = LOG.filter(l => l.status === 'selesai').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg">Coaching Log</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Catatan percakapan 1-on-1 dengan tim. Tulis langsung, jangan ditunda.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="card">
          <div className="card-body p-3">
            <p className="text-xs text-[var(--color-text-tertiary)]">Total sesi</p>
            <p className="font-mono text-2xl font-bold tabular-nums">{LOG.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-3">
            <p className="text-xs text-[var(--color-text-tertiary)]">Selesai</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-[var(--color-success)]">{selesai}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-3">
            <p className="text-xs text-[var(--color-text-tertiary)]">Belum follow up</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-[var(--color-warning)]">{belumFollowUp}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {LOG.map((entry, i) => (
          <div key={i} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-heading text-base font-semibold">{entry.nama}</p>
                    <span className="text-xs text-[var(--color-text-tertiary)]">— {entry.posisi}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)] font-mono">{entry.tanggal}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="pill" data-variant={JENIS_VARIANT[entry.jenis]}>{entry.jenis}</span>
                  <span className="pill" data-variant={entry.status === 'selesai' ? 'success' : 'warning'}>
                    {entry.status === 'selesai' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {entry.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-start gap-2 mb-2">
                    <MessageCircle className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Pembuka</p>
                      <p className="text-sm mt-0.5">{entry.pembuka}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="h-3.5 w-3.5 text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Blockers</p>
                      <p className="text-sm mt-0.5">{entry.blockers}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-start gap-2 mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-brand-500)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Follow-up</p>
                      <p className="text-sm mt-0.5">{entry.follow_up}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-start gap-2 mb-2">
                    <Clock className="h-3.5 w-3.5 text-[var(--color-info)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Next step</p>
                      <p className="text-sm mt-0.5">{entry.next_step}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
