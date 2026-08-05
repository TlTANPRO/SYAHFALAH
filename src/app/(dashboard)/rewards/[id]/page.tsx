// app/(dashboard)/rewards/[id]/page.tsx
// Reward detail — points breakdown + approval history.
// Falls back to "Template" view if user hasn't set up real data.

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Award, Calendar, TrendingUp, User } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RewardDetailPage({ params }: PageProps) {
  const { id } = await params

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) notFound()

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Try reward_log table; gracefully fallback to template view if not present.
  let reward: any = null
  try {
    const { data } = await supabase
      .from('reward_logs')
      .select(`
        id, user_id, points, source, description, period_start, period_end,
        created_at, user:users!reward_logs_user_id_fkey(id, full_name)
      `)
      .eq('id', id)
      .maybeSingle()
    reward = data
  } catch {
    // Table may not exist in current schema
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[
        { label: 'Rewards', href: '/rewards' },
        { label: reward?.id ?? id },
      ]} />

      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-5 w-5 text-[var(--color-brand-500)]" />
            <h1 className="text-xl font-semibold">Reward Detail</h1>
          </div>
          {reward ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <div className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <User className="h-3 w-3" /> User
                </div>
                {reward.user?.id ? (
                  <Link
                    href={`/admin/users/${reward.user.id}`}
                    className="text-sm font-medium text-[var(--color-brand-500)] hover:underline"
                  >
                    {reward.user.full_name}
                  </Link>
                ) : '—'}
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Poin
                </div>
                <div className="text-2xl font-bold text-[var(--color-brand-500)]">{reward.points}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Periode
                </div>
                <div className="text-sm">{reward.period_start} → {reward.period_end}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-tertiary)]">Sumber</div>
                <div className="text-sm">{reward.source}</div>
              </div>
              {reward.description && (
                <div className="col-span-2 md:col-span-4">
                  <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Deskripsi</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">{reward.description}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-lg bg-[var(--color-surface-2)]/40 text-sm text-[var(--color-text-secondary)]">
              Reward ini adalah item <strong>template/contoh</strong>. Untuk melihat data reward nyata,
              implement table <code className="text-xs">reward_logs</code> di database dan populate dari
              KPI actuals.
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail Tambahan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Reward ID</span>
              <span className="font-mono text-xs">{id}</span>
            </div>
            {reward?.created_at && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Dibuat</span>
                <span>{new Date(reward.created_at).toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
