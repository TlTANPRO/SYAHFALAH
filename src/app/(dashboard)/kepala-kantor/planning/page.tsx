// src/app/(dashboard)/kepala-kantor/planning/page.tsx
// Quarterly planning page. Live source: monthly_plans table (id, month, status, created_at).
// Schema is minimal — page falls back to Q3_2026 template when DB has no rows.

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Target, AlertTriangle, CheckCircle2, ChevronRight, Database } from 'lucide-react'

interface QuarterGoal {
  id: string
  divisi: string
  pic: string
  target: string
  kenapa: string
  status: 'belum mulai' | 'jalan' | 'selesai'
  deadline: string
}

const Q3_2026: QuarterGoal[] = [
  { id: 'q3-mkt-r', divisi: 'Marketing',  pic: 'Riza',  target: 'Closing 18 unit',           kenapa: 'Pipeline saat ini 6 calon di stage sp3k & closing, target 3 closing/bulan selama Q3.', status: 'jalan', deadline: '30 Sep 2026' },
  { id: 'q3-mkt-y', divisi: 'Marketing',  pic: 'Yudi',  target: 'Survey 30 unit',            kenapa: 'Konversi historis 1 closing per 5 survey, perlu 30 survey untuk support 6 closing.', status: 'jalan', deadline: '15 Sep 2026' },
  { id: 'q3-kst-r', divisi: 'Konstruksi', pic: 'Rizal', target: 'Selesaikan 60 unit BSA Tahap 2', kenapa: 'Target BAST ke buyer cluster BSA sudah jatuh tempo 30 Aug 2026.',              status: 'belum mulai', deadline: '30 Aug 2026' },
  { id: 'q3-kst-a', divisi: 'Konstruksi', pic: 'Andi',  target: 'Klaim garansi 0 backlog',   kenapa: 'Ada 5 unit dengan klaim pending dari Mei 2026, perlu di-clear agar NPS Q3.',     status: 'belum mulai', deadline: '31 Aug 2026' },
  { id: 'q3-md-r',  divisi: 'Media',      pic: 'Reni',  target: 'Engagement IG naik 25%',    kenapa: 'Engagement saat ini 3.4%, target industri developer 4.5%.',                     status: 'jalan', deadline: '30 Sep 2026' },
  { id: 'q3-keu-n', divisi: 'Keuangan',   pic: 'Novita', target: 'SP3K on-time 95%',          kenapa: 'SP3K currently 86% on-time, drop utama di tahap berkas.',                       status: 'jalan', deadline: '30 Sep 2026' },
  { id: 'q3-pur-s', divisi: 'Purchasing', pic: 'Sinta', target: 'Diskon material 8%',        kenapa: 'Vendor saat ini mark-up 12%, negosiasi sudah dimulai sejak Q2.',                 status: 'belum mulai', deadline: '15 Sep 2026' },
  { id: 'q3-leg-n', divisi: 'Legal',      pic: 'Bu Nisya', target: 'SHM 100% keluar dalam 90 hari', kenapa: 'Rata-rata saat ini 120 hari dari BAST, perlu push biar customer puas.', status: 'jalan', deadline: '30 Sep 2026' },
]

const STATUS_VARIANT: Record<QuarterGoal['status'], string> = {
  'belum mulai': 'neutral',
  'jalan': 'warning',
  'selesai': 'success',
}

const STATUS_LABEL: Record<QuarterGoal['status'], string> = {
  'belum mulai': 'Belum mulai',
  'jalan': 'Berjalan',
  'selesai': 'Selesai',
}

async function loadMonthlyPlans(): Promise<{ rows: any[]; live: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { rows: [], live: false }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase
    .from('monthly_plans')
    .select('id, month, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data || data.length === 0) return { rows: [], live: false }
  return { rows: data, live: true }
}

export default async function Page() {
  const { rows: liveRows, live } = await loadMonthlyPlans()
  const useLive = live && liveRows.length > 0

  const goals = useLive
    ? liveRows.map((r: any) => ({
        id: r.id,
        divisi: '—',
        pic: '—',
        target: r.month ?? 'Perencanaan bulanan',
        kenapa: `Status: ${r.status ?? 'draft'}`,
        status: 'jalan' as const,
        deadline: r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '—',
      }))
    : Q3_2026

  const statusCount = goals.reduce<Record<string, number>>((acc, g) => {
    acc[g.status] = (acc[g.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg">Planning Kuartal Q3 2026</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Target per divisi + PIC + alasan di balik target + deadline.
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-2 italic flex items-center gap-1">
          <Database className="h-3 w-3" />
          {useLive
            ? `${liveRows.length} rencana bulanan dari database`
            : 'Contoh rencana Q3 2026. Data riil di-load dari tabel monthly_plans.'}
        </p>
      </div>

      <div className="card">
        <div className="card-body p-3 text-sm bg-[var(--color-warning)]/10 border-l-4 border-[var(--color-warning)] rounded">
          ⚠️ Data template — wire ke <code className="font-mono">monthly_plans</code> table
          (schema minimal: id, month, status, created_at) untuk data aktual.
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="kpi-tile">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Selesai</span>
            <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{statusCount['selesai'] || 0}</p>
        </div>
        <div className="kpi-tile kpi-tile-warning">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Berjalan</span>
            <Target className="h-4 w-4 text-[var(--color-warning)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{statusCount['jalan'] || 0}</p>
        </div>
        <div className="kpi-tile kpi-tile-info">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Belum mulai</span>
            <AlertTriangle className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          </div>
          <p className="font-heading text-2xl font-bold tabular-nums">{statusCount['belum mulai'] || 0}</p>
        </div>
      </div>

      {/* Goals list */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--color-brand-500)]" />
            Daftar Target Q3
          </h2>
        </div>
        <div className="card-body p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)]">
                <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Divisi</th>
                <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">PIC</th>
                <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Target</th>
                <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Deadline</th>
                <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {goals.map(g => (
                <tr key={g.id} className="border-b border-[var(--color-border-default)]/50 hover:bg-[var(--color-surface-2)]/30 transition-colors">
                  <td className="p-3 text-[var(--color-text-secondary)]">{g.divisi}</td>
                  <td className="p-3">
                    <Link
                      href={`/divisi`}
                      className="group inline-flex items-center gap-1 text-[var(--color-brand-500)] hover:underline"
                    >
                      {g.pic}
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-[var(--color-text-primary)]">{g.target}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{g.kenapa}</div>
                  </td>
                  <td className="p-3 text-[var(--color-text-secondary)] tabular-nums">{g.deadline}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      STATUS_VARIANT[g.status] === 'success' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' :
                      STATUS_VARIANT[g.status] === 'warning' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' :
                      'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'
                    }`}>
                      {STATUS_LABEL[g.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
