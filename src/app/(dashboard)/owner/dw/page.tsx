// src/app/(dashboard)/owner/dw/page.tsx
// Data Warehouse overview — shows recent snapshots + manual trigger button.
// Owner-only.

import { createClient } from "@supabase/supabase-js"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { HeroSection } from "@/components/layout/HeroSection"
import { EmptyState } from "@/components/ui/empty-state"
import { Database, RefreshCw, Calendar } from "lucide-react"
import { requireRole } from "@/lib/auth/role-guard"

export const dynamic = "force-dynamic"

async function loadSnapshots() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { snapshots: [], lastSnapshot: null, error: null }

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: snapshots, error } = await sb
    .from("dw_snapshots")
    .select("id, snapshot_date, status, started_at, completed_at, row_counts")
    .order("snapshot_date", { ascending: false })
    .limit(30)

  if (error) return { snapshots: [], lastSnapshot: null, error: error.message }

  return {
    snapshots: snapshots ?? [],
    lastSnapshot: snapshots?.[0] ?? null,
    error: null,
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—"
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return "baru saja"
  if (min < 60) return `${min} menit lalu`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} jam lalu`
  const days = Math.floor(hr / 24)
  return `${days} hari lalu`
}

export default async function DWPage() {
  await requireRole("owner")
  const { snapshots, lastSnapshot, error } = await loadSnapshots()

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: "Owner" }, { label: "Data Warehouse" }]} />

      <HeroSection
        eyebrow="Owner"
        title="Data Warehouse."
        subtitle="Snapshot harian dari KPI, leads, tasks, dan cashflow untuk reporting."
      />

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700">
          Gagal memuat snapshots: {error}
        </div>
      )}

      {/* Last snapshot status card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] mb-2">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            Last Snapshot
          </div>
          <div className="text-lg font-semibold">
            {lastSnapshot ? lastSnapshot.snapshot_date : "Belum ada"}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {lastSnapshot?.completed_at ? timeAgo(lastSnapshot.completed_at) : "—"}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] mb-2">
            <Database className="h-3.5 w-3.5" aria-hidden />
            Status
          </div>
          <div className="text-lg font-semibold">
            {lastSnapshot?.status ?? "—"}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
            Auto trigger via Vercel Cron (02:00 WIB)
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 flex flex-col justify-between">
          <div className="text-xs text-[var(--color-text-tertiary)]">Trigger Manual</div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-1">
            Snapshot berikutnya otomatis jalan 02:00 WIB. Manual trigger via curl
            dengan <code className="text-[10px] bg-[var(--color-surface-2)] px-1 rounded">CRON_SECRET</code>.
          </div>
        </div>
      </div>

      {/* Snapshot table */}
      {snapshots.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Belum ada snapshot"
          description="Snapshot pertama akan dibuat setelah cron worker jalan pertama kali."
        />
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2)]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Tanggal</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Completed</th>
                <th className="text-left px-4 py-2.5 font-medium">Rows</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-2 font-mono text-xs">{s.snapshot_date}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                        s.status === "completed"
                          ? "bg-green-500/10 text-green-700"
                          : s.status === "running"
                          ? "bg-amber-500/10 text-amber-700"
                          : "bg-red-500/10 text-red-700"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--color-text-tertiary)]">
                    {s.completed_at ? new Date(s.completed_at).toLocaleString("id-ID") : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">
                    {s.row_counts ? JSON.stringify(s.row_counts) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
