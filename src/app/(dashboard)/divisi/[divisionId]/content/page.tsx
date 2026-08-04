// divisi/[divisionId]/content/page.tsx
// Content calendar untuk divisi Media. Karena tabel content_calendar
// belum ada, pakai data statis jadwal rutin media team.

import { Calendar, Clock, User } from 'lucide-react'

interface ContentPlan {
  minggu: string
  jenis: string
  judul: string
  pic: string
  platform: string
  status: 'draft' | 'review' | 'scheduled' | 'published'
}

const RENCANA: ContentPlan[] = [
  { minggu: '2026-08 W1', jenis: 'Reels',  judul: 'Tour rumah BSA tipe 36 + angsuran',       pic: 'Rifki', platform: 'IG',     status: 'published' },
  { minggu: '2026-08 W1', jenis: 'Carousel', judul: '5 alasan pilih Grati Asri buat first home buyer', pic: 'Reta', platform: 'IG',  status: 'published' },
  { minggu: '2026-08 W2', jenis: 'Reels',  judul: 'Behind the scene pembangunan Kavling',  pic: 'Rifki', platform: 'TikTok', status: 'scheduled' },
  { minggu: '2026-08 W2', jenis: 'Carousel', judul: 'SP3K dalam 14 hari: tips upload berkas', pic: 'Reta', platform: 'IG',  status: 'review' },
  { minggu: '2026-08 W3', jenis: 'Reels',  judul: 'Testimoni Pak Haji Sutomo (BSA 2025)',  pic: 'Reni',  platform: 'IG',     status: 'draft' },
  { minggu: '2026-08 W3', jenis: 'Article', judul: 'Kenapa pilih KPR FLPP, bukan KPR biasa', pic: 'Reta', platform: 'Blog',  status: 'draft' },
  { minggu: '2026-08 W4', jenis: 'Reels',  judul: 'Unit terakhir Klampokarum, siap huni',  pic: 'Rifki', platform: 'IG',     status: 'draft' },
  { minggu: '2026-08 W4', jenis: 'Carousel', judul: 'Proses balik nama SHM step by step', pic: 'Reta', platform: 'IG',       status: 'draft' },
]

const STATUS_VARIANT: Record<ContentPlan['status'], string> = {
  draft: 'neutral',
  review: 'warning',
  scheduled: 'info',
  published: 'success',
}

export default function Page() {
  const byWeek = RENCANA.reduce<Record<string, ContentPlan[]>>((acc, r) => {
    (acc[r.minggu] = acc[r.minggu] || []).push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg">Content Calendar</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Jadwal Agustus 2026. PIC: Reni (review), Rifki (Reels), Reta (Carousel & artikel).
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(byWeek).map(([week, items]) => (
          <div key={week} className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                <h2 className="font-heading text-base font-semibold">{week}</h2>
                <span className="pill" data-variant="info">{items.length} konten</span>
              </div>
            </div>
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {items.map((c, i) => (
                <div key={i} className="px-6 py-3 hover:bg-[var(--color-surface-2)] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="pill" data-variant="neutral">{c.jenis}</span>
                        <span className="pill" data-variant="info">{c.platform}</span>
                        <span className="pill" data-variant={STATUS_VARIANT[c.status]}>{c.status}</span>
                      </div>
                      <p className="text-sm font-medium">{c.judul}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                        <User className="h-3 w-3" />
                        <span>{c.pic}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
