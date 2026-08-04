// divisi/[divisionId]/leads/page.tsx
// Pipeline leads marketing per divisi. Pakai tabel leads (kalau sudah
// ada setelah migration 011). Kalau belum, tampil pesan singkat.

import { createClient } from '@supabase/supabase-js'
import { Phone, Calendar, MapPin, User } from 'lucide-react'

interface Lead {
  id: string
  customer_name: string
  customer_phone: string | null
  stage: string
  source: string
  estimated_value_rupiah: number
  cluster_id: string | null
  assigned_to_id: string | null
  contacted_at: string | null
  surveyed_at: string | null
  created_at: string
}

const STAGE_LABEL: Record<string, { label: string; variant: string }> = {
  new:       { label: 'Baru',      variant: 'neutral' },
  contacted: { label: 'Dihubungi', variant: 'info' },
  survey:    { label: 'Survey',    variant: 'info' },
  booking:   { label: 'Booking',   variant: 'warning' },
  sp3k:      { label: 'SP3K',      variant: 'warning' },
  closing:   { label: 'Akad',      variant: 'success' },
  closed:    { label: 'Selesai',   variant: 'success' },
  batal:     { label: 'Batal',     variant: 'danger' },
}

const SOURCE_LABEL: Record<string, string> = {
  meta_ads: 'Meta Ads',
  tiktok_ads: 'TikTok',
  organic: 'Organic',
  walk_in: 'Walk-in',
  referral: 'Referral',
  exhouse: 'Ex-house',
}

function formatRp(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}jt`
  return String(n)
}

async function load() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  try {
    const { data } = await sb
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    return (data ?? []) as Lead[]
  } catch {
    return []
  }
}

export default async function Page() {
  const leads = await load()
  const byStage = leads.reduce<Record<string, Lead[]>>((acc, l) => {
    (acc[l.stage] = acc[l.stage] || []).push(l)
    return acc
  }, {})
  const stages = ['new', 'contacted', 'survey', 'booking', 'sp3k', 'closing', 'closed', 'batal']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg">Pipeline Marketing</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {leads.length > 0 ? `${leads.length} calon buyer aktif · geser ke stage berikutnya.` : 'Belum ada leads.'}
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Leads akan masuk setelah migration 011 dijalankan. Tabel <code className="font-mono text-xs">leads</code> belum ada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {stages.map(stage => {
            const items = byStage[stage] || []
            const stageInfo = STAGE_LABEL[stage] || { label: stage, variant: 'neutral' }
            return (
              <div key={stage}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="pill" data-variant={stageInfo.variant}>{stageInfo.label}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)] font-mono">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map(lead => (
                    <div key={lead.id} className="pipeline-stage" data-color={stage}>
                      <p className="font-medium text-sm truncate">{lead.customer_name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] mt-1">
                        <Phone className="h-3 w-3" />
                        <span className="font-mono">{lead.customer_phone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>{SOURCE_LABEL[lead.source] || lead.source}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border-subtle)]">
                        <span className="text-xs text-[var(--color-text-tertiary)]">Nilai</span>
                        <span className="font-mono text-xs font-semibold">Rp {formatRp(lead.estimated_value_rupiah)}</span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-3 text-center">
                      <p className="text-xs text-[var(--color-text-tertiary)]">kosong</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
