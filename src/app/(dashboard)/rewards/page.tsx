// src/app/(dashboard)/rewards/page.tsx
// Live data + template fallback.
// Live source: `rewards` table (id, user_id, type, title, description, created_at)
// Fallback: REWARD_LOG + PUNISHMENT_LOG constants (shown when table is empty)

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { TrendingUp, AlertTriangle, Award, Sparkles, ChevronRight, Database } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

interface RewardEntry {
  id: string
  bulan: string
  nama: string
  divisi: string
  jenis: 'closing' | 'qc' | 'tim_media' | 'survey'
  jumlah: number
  rate: number
  total: number
}

const REWARD_LOG: RewardEntry[] = [
  { id: 'tpl-1', bulan: 'Juli 2026', nama: 'Riza',     divisi: 'Marketing', jenis: 'closing', jumlah: 4, rate: 500000, total: 2_000_000 },
  { id: 'tpl-2', bulan: 'Juli 2026', nama: 'Mada',     divisi: 'KK',        jenis: 'closing', jumlah: 1, rate: 500000, total: 500_000 },
  { id: 'tpl-3', bulan: 'Juli 2026', nama: 'Amir',     divisi: 'Konstruksi',jenis: 'closing', jumlah: 1, rate: 500000, total: 500_000 },
  { id: 'tpl-4', bulan: 'Juli 2026', nama: 'Rizal',    divisi: 'Konstruksi',jenis: 'qc',      jumlah: 4, rate: 250000, total: 1_000_000 },
  { id: 'tpl-5', bulan: 'Juni 2026', nama: 'Riza',     divisi: 'Marketing', jenis: 'closing', jumlah: 6, rate: 500000, total: 3_000_000 },
  { id: 'tpl-6', bulan: 'Juni 2026', nama: 'Rizal',    divisi: 'Konstruksi',jenis: 'qc',      jumlah: 6, rate: 250000, total: 1_500_000 },
  { id: 'tpl-7', bulan: 'Juni 2026', nama: 'Tim Media',divisi: 'Media',     jenis: 'tim_media', jumlah: 1, rate: 1_250_000, total: 1_250_000 },
]

interface PunishmentEntry {
  id: string
  tanggal: string
  nama: string
  jenis: 'Coaching' | 'SP1' | 'SP2' | 'SP3'
  alasan: string
  status: 'aktif' | 'selesai coaching'
}

const PUNISHMENT_LOG: PunishmentEntry[] = [
  { id: 'tpl-1', tanggal: '2026-08-01', nama: 'Yudi',     jenis: 'Coaching', alasan: 'Survey batal karena tidak teliti cek berkas', status: 'selesai coaching' },
  { id: 'tpl-2', tanggal: '2026-07-15', nama: 'Amir',     jenis: 'SP1',      alasan: 'Terlambat kirim laporan harian 3x berturut-turut', status: 'aktif' },
  { id: 'tpl-3', tanggal: '2026-06-20', nama: 'Riza',     jenis: 'Coaching', alasan: 'Closing score rendah karena tidak follow up SP3K', status: 'selesai coaching' },
  { id: 'tpl-4', tanggal: '2026-05-12', nama: 'Sinta',    jenis: 'SP1',      alasan: 'Material datang terlambat dari PO', status: 'aktif' },
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

interface LiveReward {
  id: string
  user_id: string
  type: string
  title: string
  description: string | null
  created_at: string
  user?: { full_name: string; division?: { name: string } | null } | null
}

async function loadRewards(): Promise<{ rows: LiveReward[]; live: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { rows: [], live: false }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase
    .from('rewards')
    .select('id, user_id, type, title, description, created_at, user:users!rewards_user_id_fkey(full_name, division:divisions(name))')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data || data.length === 0) return { rows: [], live: false }
  return { rows: data as any, live: true }
}

export default async function Page() {
  const { rows: liveRows, live } = await loadRewards()
  const useLive = live && liveRows.length > 0

  const totalReward = useLive
    ? liveRows.reduce((s, r) => s + 100_000, 0) // placeholder calc until DB has amount col
    : REWARD_LOG.reduce((s, r) => s + r.total, 0)

  // topEarner can be either [name, amount] tuple (template) or { name, amount } object (live)
  const topEarner: { name: string; amount: number } | null = useLive
    ? { name: liveRows[0]?.user?.full_name ?? '—', amount: 100_000 }
    : (() => {
        const byName = REWARD_LOG.reduce<Record<string, number>>((acc, r) => {
          acc[r.nama] = (acc[r.nama] || 0) + r.total
          return acc
        }, {})
        const sorted = Object.entries(byName).sort((a, b) => b[1] - a[1])[0]
        return sorted ? { name: sorted[0], amount: sorted[1] } : null
      })()

  const activePunishment = PUNISHMENT_LOG.filter(p => p.status === 'aktif').length

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs crumbs={[{ label: 'Reward & Punishment' }]} />
        <h1 className="display-lg">Reward & Punishment</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Perhitungan insentif dan tracking surat peringatan tim.
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-2 italic flex items-center gap-1">
          <Database className="h-3 w-3" />
          {useLive
            ? `${liveRows.length} reward entries dari database`
            : 'Data di bawah adalah contoh untuk preview. Reward & punishment riil dihitung otomatis dari tabel closing dan SP aktif.'}
        </p>
      </div>

      <div className="card">
        <div className="card-body p-3 text-sm bg-[var(--color-warning)]/10 border-l-4 border-[var(--color-warning)] rounded">
          ⚠️ Data template — untuk reward riil, hitung otomatis dari tabel <code className="font-mono">closings</code> dan <code className="font-mono">kpi_actuals</code>, simpan ke <code className="font-mono">reward_entries</code> table.
        </div>
      </div>

      {/* 4 ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-tile">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Total reward Juli</span>
            <Sparkles className="h-4 w-4 text-[var(--color-brand-500)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{formatRp(totalReward)}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {useLive ? liveRows.length : REWARD_LOG.length} entri reward
          </p>
        </div>
        <div className="kpi-tile kpi-tile-info">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Top earner</span>
            <Award className="h-4 w-4 text-[var(--color-brand-500)]" />
          </div>
          <p className="font-heading text-xl font-bold tabular-nums">{topEarner?.name ?? '—'}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {topEarner ? formatRp(topEarner.amount) : ''}
          </p>
        </div>
        <div className="kpi-tile kpi-tile-warning">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Punishment aktif</span>
            <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{activePunishment}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">SP + coaching</p>
        </div>
        <div className="kpi-tile kpi-tile-success">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Selesai coaching</span>
            <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">
            {PUNISHMENT_LOG.filter(p => p.status === 'selesai coaching').length}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">bulan ini</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reward log */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="card-title flex items-center gap-2">
              <Award className="h-4 w-4 text-[var(--color-brand-500)]" />
              Reward Log
            </h2>
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {useLive ? 'Live data' : 'Template'}
            </span>
          </div>
          <div className="card-body p-0">
            {useLive ? (
              <ul className="divide-y divide-[var(--color-border-subtle)]">
                {liveRows.map(r => (
                  <li key={r.id}>
                    <Link
                      href={`/rewards/${r.id}`}
                      className="flex items-center justify-between gap-3 p-3 hover:bg-[var(--color-surface-2)]/50 transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-brand-500)]">
                          {r.user?.full_name ?? 'Unknown user'}
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)] truncate">{r.title}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-default)]">
                    <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Bulan</th>
                    <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Nama</th>
                    <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Divisi</th>
                    <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Jenis</th>
                    <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {REWARD_LOG.map(r => (
                    <tr key={r.id} className="border-b border-[var(--color-border-default)]/50 hover:bg-[var(--color-surface-2)]/30 transition-colors">
                      <td className="p-3 text-[var(--color-text-secondary)]">{r.bulan}</td>
                      <td className="p-3">
                        <Link href={`/rewards/${r.id}`} className="group inline-flex items-center gap-1 text-[var(--color-brand-500)] hover:underline">
                          {r.nama}
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="p-3 text-[var(--color-text-secondary)]">{r.divisi}</td>
                      <td className="p-3 text-[var(--color-text-secondary)]">{JENIS_LABEL[r.jenis]}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{formatRp(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Punishment log */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
              Punishment Log
            </h2>
          </div>
          <div className="card-body p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)]">
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Tanggal</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Nama</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Jenis</th>
                  <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {PUNISHMENT_LOG.map(p => (
                  <tr key={p.id} className="border-b border-[var(--color-border-default)]/50 hover:bg-[var(--color-surface-2)]/30 transition-colors">
                    <td className="p-3 text-[var(--color-text-secondary)] tabular-nums">{p.tanggal}</td>
                    <td className="p-3">
                      <Link href={`/rewards/${p.id}`} className="group inline-flex items-center gap-1 text-[var(--color-brand-500)] hover:underline">
                        {p.nama}
                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        PUNISHMENT_VARIANT[p.jenis] === 'danger' ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]' :
                        PUNISHMENT_VARIANT[p.jenis] === 'warning' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' :
                        'bg-[var(--color-info)]/10 text-[var(--color-info)]'
                      }`}>
                        {p.jenis}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        p.status === 'aktif'
                          ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                          : 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
