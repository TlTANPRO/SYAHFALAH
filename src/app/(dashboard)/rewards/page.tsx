// src/app/(dashboard)/rewards/page.tsx
// Kalkulator reward & tracking punishment berdasarkan program kerja.
// Reward dihitung dari closing aktual, dikalikan rate dari program.
// Punishment: warning → SP1 → SP2 → SP3 jika warning berturut-turut.

import { TrendingUp, AlertTriangle, Award, Sparkles } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

interface RewardEntry {
  bulan: string
  nama: string
  divisi: string
  jenis: 'closing' | 'qc' | 'tim_media' | 'survey'
  jumlah: number
  rate: number
  total: number
}

const REWARD_LOG: RewardEntry[] = [
  { bulan: 'Juli 2026', nama: 'Riza',     divisi: 'Marketing', jenis: 'closing', jumlah: 4, rate: 500000, total: 2_000_000 },
  { bulan: 'Juli 2026', nama: 'Mada',     divisi: 'KK',        jenis: 'closing', jumlah: 1, rate: 500000, total: 500_000 },
  { bulan: 'Juli 2026', nama: 'Amir',     divisi: 'Konstruksi',jenis: 'closing', jumlah: 1, rate: 500000, total: 500_000 },
  { bulan: 'Juli 2026', nama: 'Rizal',    divisi: 'Konstruksi',jenis: 'qc',      jumlah: 4, rate: 250000, total: 1_000_000 },
  { bulan: 'Juni 2026', nama: 'Riza',     divisi: 'Marketing', jenis: 'closing', jumlah: 6, rate: 500000, total: 3_000_000 },
  { bulan: 'Juni 2026', nama: 'Rizal',    divisi: 'Konstruksi',jenis: 'qc',      jumlah: 6, rate: 250000, total: 1_500_000 },
  { bulan: 'Juni 2026', nama: 'Tim Media',divisi: 'Media',     jenis: 'tim_media', jumlah: 1, rate: 1_250_000, total: 1_250_000 },
]

interface PunishmentEntry {
  tanggal: string
  nama: string
  jenis: 'Coaching' | 'SP1' | 'SP2' | 'SP3'
  alasan: string
  status: 'aktif' | 'selesai coaching'
}

const PUNISHMENT_LOG: PunishmentEntry[] = [
  { tanggal: '2026-08-01', nama: 'Yudi',     jenis: 'Coaching', alasan: 'Survey batal karena tidak teliti cek berkas', status: 'selesai coaching' },
  { tanggal: '2026-07-15', nama: 'Amir',     jenis: 'SP1',      alasan: 'Terlambat kirim laporan harian 3x berturut-turut', status: 'aktif' },
  { tanggal: '2026-06-20', nama: 'Riza',     jenis: 'Coaching', alasan: 'Closing score rendah karena tidak follow up SP3K', status: 'selesai coaching' },
  { tanggal: '2026-05-12', nama: 'Sinta',    jenis: 'SP1',      alasan: 'Material datang terlambat dari PO', status: 'aktif' },
]

function formatRp(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID')
}

const JENIS_LABEL: Record<RewardEntry['jenis'], string> = {
  closing: 'Closing',
  qc: 'QC unit',
  tim_media: 'Tim media',
  survey: 'Survey',
}

const PUNISHMENT_VARIANT: Record<PunishmentEntry['jenis'], string> = {
  'Coaching': 'info',
  'SP1': 'warning',
  'SP2': 'warning',
  'SP3': 'danger',
}

export default function Page() {
  const totalReward = REWARD_LOG.reduce((s, r) => s + r.total, 0)
  const byName = REWARD_LOG.reduce<Record<string, number>>((acc, r) => {
    acc[r.nama] = (acc[r.nama] || 0) + r.total
    return acc
  }, {})
  const topEarner = Object.entries(byName).sort((a, b) => b[1] - a[1])[0]
  const activePunishment = PUNISHMENT_LOG.filter(p => p.status === 'aktif').length

  return (
    <div className="space-y-6">
      <div>
      <Breadcrumbs crumbs={ [{ label: 'Reward & Punishment' }] } />
        
        <h1 className="display-lg">Reward & Punishment</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Perhitungan insentif dan tracking surat peringatan tim.
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-2 italic">
          Data di bawah adalah contoh untuk preview. Reward & punishment riil dihitung otomatis dari tabel closing dan SP aktif.
        </p>
      </div>

      {/* 4 ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-tile">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Total reward Juli</span>
            <Sparkles className="h-4 w-4 text-[var(--color-brand-500)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{formatRp(totalReward)}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{REWARD_LOG.length} entri reward</p>
        </div>
        <div className="kpi-tile kpi-tile-info">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Top earner</span>
            <Award className="h-4 w-4 text-[var(--color-info)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{topEarner ? topEarner[0] : '—'}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{topEarner ? formatRp(topEarner[1]) : '—'}</p>
        </div>
        <div className="kpi-tile kpi-tile-warning">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">SP aktif</span>
            <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{activePunishment}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">belum selesai</p>
        </div>
        <div className="kpi-tile kpi-tile-danger">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Total SP periode</span>
            <AlertTriangle className="h-4 w-4 text-[var(--color-danger)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{PUNISHMENT_LOG.length}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Mulai Mei 2026</p>
        </div>
      </div>

      {/* Tabel reward */}
      <div>
        <h2 className="display-md">Log reward</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Rp 500k/closing · Rp 250k/QC unit · Rp 1,25jt/bulan tim media</p>
      </div>
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bulan</th>
              <th>Nama</th>
              <th>Divisi</th>
              <th>Jenis</th>
              <th className="text-right">Jumlah</th>
              <th className="text-right">Rate</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {REWARD_LOG.map((r, i) => (
              <tr key={i}>
                <td className="font-mono text-xs">{r.bulan}</td>
                <td className="font-medium">{r.nama}</td>
                <td className="text-sm text-[var(--color-text-secondary)]">{r.divisi}</td>
                <td>
                  <span className="pill" data-variant="success">{JENIS_LABEL[r.jenis]}</span>
                </td>
                <td className="text-right font-mono text-xs">{r.jumlah}</td>
                <td className="text-right font-mono text-xs">{formatRp(r.rate)}</td>
                <td className="text-right font-mono text-sm font-semibold">{formatRp(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Log punishment */}
      <div>
        <h2 className="display-md">Log punishment</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Urutan: coaching → SP1 → SP2 → SP3</p>
      </div>
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Nama</th>
              <th>Jenis</th>
              <th>Alasan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {PUNISHMENT_LOG.map((p, i) => (
              <tr key={i}>
                <td className="font-mono text-xs">{p.tanggal}</td>
                <td className="font-medium">{p.nama}</td>
                <td>
                  <span className="pill" data-variant={PUNISHMENT_VARIANT[p.jenis]}>{p.jenis}</span>
                </td>
                <td className="text-sm text-[var(--color-text-secondary)] max-w-md">{p.alasan}</td>
                <td>
                  <span className="pill" data-variant={p.status === 'aktif' ? 'warning' : 'success'}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
