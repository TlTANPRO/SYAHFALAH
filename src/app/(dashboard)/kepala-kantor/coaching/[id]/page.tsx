// src/app/(dashboard)/kepala-kantor/coaching/[id]/page.tsx
// Coaching session detail page.

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, MessageCircle, AlertCircle, CheckCircle2, Clock, ArrowLeft } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

interface CoachingEntry {
  id: string
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

// Mirror template from page.tsx (only way to render template entries without a DB row)
const TEMPLATES: Record<string, CoachingEntry> = {
  'tpl-1': { id: 'tpl-1', tanggal: '2026-08-01', nama: 'Yudi',   posisi: 'Staff Marketing',  pembuka: 'Cek progress survey dan apa yang bikin stuck akhir-akhir ini.', blockers: 'Susah follow up setelah SP3K, banyak buyer yang tiba-tiba batal.', follow_up: 'Buat script follow up SP3K H+3, H+7, H+14.', next_step: 'Lapor minggu depan', status: 'belum follow up', jenis: 'performa rendah' },
  'tpl-2': { id: 'tpl-2', tanggal: '2026-07-28', nama: 'Amir',   posisi: 'Staff Marketing',  pembuka: 'Konfirmasi deadline laporan harian yang molor 3x.',           blockers: 'Lagi bagi fokus dengan visit site di Klampokarum.',               follow_up: 'Laporan harian harus masuk sebelum pukul 18.00, lewat 1x = coaching.', next_step: 'Lapor besok',       status: 'selesai',         jenis: 'pelanggaran' },
  'tpl-3': { id: 'tpl-3', tanggal: '2026-07-22', nama: 'Rifki',  posisi: 'Kreatif Media',    pembuka: 'Check output konten Rabuan dan IG Reels series.',           blockers: 'Antri approval brand guidelines dari Reni.',                       follow_up: 'Pakai template lama dulu, approval belakangan.',                    next_step: 'Deliver 4 Reels minggu ini', status: 'selesai',         jenis: 'rutin' },
  'tpl-4': { id: 'tpl-4', tanggal: '2026-07-15', nama: 'Riza',   posisi: 'Marketing',        pembuka: 'Review closing bulan Juni (6 closing) — di atas target.',    blockers: 'Lead quality dari Meta Ads sedang turun, awal Agustus perlu refresh.', follow_up: 'Koordinir dengan Rifki untuk iklan baru.',                          next_step: 'Sesi lanjutan 2 minggu lagi', status: 'selesai',         jenis: 'rutin' },
  'tpl-5': { id: 'tpl-5', tanggal: '2026-07-10', nama: 'Sinta',  posisi: 'Purchasing',       pembuka: 'PO material Klampokarum delivered 4 hari terlambat.',       blockers: 'Vendor utama switch supplier, harga naik 12%.',                    follow_up: 'Cari vendor alternatif, negosiasi frame contract.',                 next_step: 'Submit 3 vendor alternatif', status: 'belum follow up', jenis: 'pelanggaran' },
}

async function loadEntry(id: string): Promise<CoachingEntry | null> {
  // Try template first
  if (TEMPLATES[id]) return TEMPLATES[id]

  // Try DB
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: t, error } = await supabase
    .from('tasks')
    .select('id, title, description, status, scheduled_date, assignee:users!tasks_assignee_id_fkey(full_name, position, division:divisions(name))')
    .eq('id', id)
    .maybeSingle()
  if (error || !t) return null
  const lines = (t.description ?? '').split('\n')
  const assignee = Array.isArray(t.assignee) ? t.assignee[0] : t.assignee
  const division = Array.isArray(assignee?.division) ? assignee.division[0] : assignee?.division
  return {
    id: t.id,
    tanggal: t.scheduled_date ?? '—',
    nama: assignee?.full_name ?? 'Unknown',
    posisi: assignee?.position ?? division?.name ?? '—',
    pembuka: t.title,
    blockers: lines[0] || '—',
    follow_up: lines[1] || '—',
    next_step: lines[2] || '—',
    status: t.status === 'completed' ? 'selesai' : 'belum follow up',
    jenis: 'rutin',
  }
}

const JENIS_VARIANT: Record<CoachingEntry['jenis'], string> = {
  rutin: 'neutral',
  'performa rendah': 'warning',
  pelanggaran: 'danger',
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const entry = await loadEntry(id)
  if (!entry) notFound()

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[
        { label: 'Kepala Kantor', href: '/kepala-kantor' },
        { label: 'Coaching', href: '/kepala-kantor/coaching' },
        { label: entry.nama },
      ]} />

      <Link
        href="/kepala-kantor/coaching"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-brand-500)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke daftar coaching
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="display-lg flex items-center gap-2">
            {entry.nama}
            <ChevronRight className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{entry.posisi}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1 font-mono">{entry.tanggal}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="pill" data-variant={JENIS_VARIANT[entry.jenis]}>{entry.jenis}</span>
          <span className="pill" data-variant={entry.status === 'selesai' ? 'success' : 'warning'}>
            {entry.status === 'selesai' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {entry.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-body p-4">
            <div className="flex items-start gap-2">
              <MessageCircle className="h-4 w-4 text-[var(--color-text-tertiary)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Pembuka</p>
                <p className="text-sm mt-1">{entry.pembuka}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Blockers</p>
                <p className="text-sm mt-1">{entry.blockers}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--color-brand-500)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Follow-up</p>
                <p className="text-sm mt-1">{entry.follow_up}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-4">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-[var(--color-info)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Next step</p>
                <p className="text-sm mt-1">{entry.next_step}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
