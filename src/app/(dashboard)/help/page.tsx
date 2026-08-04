// src/app/(dashboard)/help/page.tsx
// FAQ singkat untuk tim. Ditambah kontak untuk hal yang belum terjawab.

import { HelpCircle, MessageCircle, ChevronDown } from 'lucide-react'

const FAQ = [
  {
    q: 'Saya lupa PIN, gimana?',
    a: 'Hubungi Pak Ardian langsung. PIN tidak bisa di-reset sendiri dari dashboard. Kalau Owner lupa, hubungi admin sistem (Mada).',
  },
  {
    q: 'Kapan saya harus update KPI?',
    a: 'KPI personal mingguan di-update setiap Jumat jam 17.00. KPI divisi bulanan di-update maksimal tanggal 28 tiap bulan.',
  },
  {
    q: 'Kenapa nilai pipeline sering 0?',
    a: 'Pipeline mengambil data dari tabel leads. Kalau 0, berarti leads belum di-tag nilainya. Default Rp 380jt/unit sesuai harga cluster standar. Update nilai saat survey.',
  },
  {
    q: 'Berapa reward per closing?',
    a: 'Rp 500.000 per closing. QC unit inspected dapat Rp 250.000/unit. Tim media flat Rp 1.250.000/bulan jika konten on-schedule.',
  },
  {
    q: 'Bagaimana urutan punishment?',
    a: 'Coaching (lisan) → SP1 (30 hari) → SP2 (60 hari) → SP3 (PHK). Naikkan level jika pelanggaran berulang dalam 90 hari.',
  },
  {
    q: 'Kapan meeting wajib?',
    a: 'Daily standup Senin–Kamis 08.30 (15 menit). Weekly standup Senin 09.00 (40 menit). Monthly review akhir bulan. Cek menu Calendar.',
  },
  {
    q: 'Bisa ganti tema terang/gelap?',
    a: 'Bisa. Buka Settings → Tampilan → pilih Gelap, Terang, atau Otomatis. Preferensi tersimpan di browser.',
  },
  {
    q: 'Data leads belum muncul, kenapa?',
    a: 'Tabel leads dibuat oleh migration 011. Kalau belum ada, minta Owner untuk apply file supabase/migrations/011_clusters.sql di Supabase Dashboard.',
  },
  {
    q: 'Berlaku untuk divisi apa saja?',
    a: 'Semua: Marketing, Konstruksi, Maintenance, Keuangan, Media, Purchasing, Legal. Plus corporate owner.',
  },
  {
    q: 'Ada kontak WA group tim?',
    a: 'Ada. Minta link ke Mada (Kepala Kantor) atau Owner. Grup Syahfalah Operasional.',
  },
]

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg">Help & FAQ</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Pertanyaan yang sering ditanyain. Kalau belum ada di sini, hubungi Mada.
        </p>
      </div>

      <div className="space-y-2">
        {FAQ.map((f, i) => (
          <details key={i} className="card group">
            <summary className="card-body cursor-pointer flex items-center justify-between gap-3 list-none">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-4 w-4 text-[var(--color-brand-500)] flex-shrink-0" />
                <p className="font-medium text-sm">{f.q}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)] group-open:rotate-180 transition-transform" />
            </summary>
            <div className="px-6 pb-4 pt-0 -mt-2">
              <p className="text-sm text-[var(--color-text-secondary)] pl-7">{f.a}</p>
            </div>
          </details>
        ))}
      </div>

      <div className="card kpi-tile">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Pertanyaan tidak terjawab?</p>
            <p className="font-heading text-base font-semibold">Hubungi Mada (Kepala Kantor)</p>
          </div>
          <MessageCircle className="h-8 w-8 text-[var(--color-brand-500)]" />
        </div>
      </div>
    </div>
  )
}
