// src/app/(dashboard)/leave/page.tsx
// Leave / Cuti module — request and track leave.
// Owner + KK can approve/reject; staff can request.

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import {
  CalendarOff,
  Plus,
  Check,
  X,
  Plane,
  Stethoscope,
  User,
  Baby,
  Heart,
  Wallet,
} from "lucide-react"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { HeroSection } from "@/components/layout/HeroSection"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/empty-state"
import { requireRole } from "@/lib/auth/role-guard"

export const dynamic = "force-dynamic"

async function loadData(userId: string, isAdmin: boolean) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { requests: [], pending: 0 }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // Owner/KK see all; staff see own
  const q = sb
    .from("leave_requests")
    .select("id, user_id, start_date, end_date, type, reason, status, approved_by, approved_at, rejection_reason, created_at, user:users!leave_requests_user_id_fkey(name, position)")
    .order("start_date", { ascending: false })
    .limit(50)

  if (!isAdmin) {
    q.eq("user_id", userId)
  }

  const { data: requests } = await q

  const { count: pending } = await sb
    .from("leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")

  return {
    requests: requests || [],
    pending: pending || 0,
  }
}

async function approve(id: string) {
  "use server"
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const session = await requireRole("kepala_kantor")
  await sb
    .from("leave_requests")
    .update({
      status: "approved",
      approved_by: session.userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
  revalidatePath("/leave")
}

async function reject(id: string, reason: string) {
  "use server"
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const session = await requireRole("kepala_kantor")
  await sb
    .from("leave_requests")
    .update({
      status: "rejected",
      approved_by: session.userId,
      approved_at: new Date().toISOString(),
      rejection_reason: reason || "Tidak disetujui",
    })
    .eq("id", id)
  revalidatePath("/leave")
}

const TYPE_META: Record<string, { icon: any; label: string }> = {
  annual: { icon: Plane, label: "Cuti tahunan" },
  sick: { icon: Stethoscope, label: "Sakit" },
  personal: { icon: User, label: "Keperluan pribadi" },
  maternity: { icon: Baby, label: "Cuti melahirkan" },
  paternity: { icon: Baby, label: "Cuti ayah" },
  unpaid: { icon: Wallet, label: "Tanpa gaji" },
}

const STATUS_META: Record<string, { label: string; variant: string }> = {
  pending: { label: "Menunggu", variant: "warning" },
  approved: { label: "Disetujui", variant: "verdigris" },
  rejected: { label: "Ditolak", variant: "danger" },
  cancelled: { label: "Dibatalkan", variant: "neutral" },
}

export default async function LeavePage() {
  const session = await requireRole("staff")
  const isAdmin = session.role === "owner" || session.role === "kepala_kantor"
  const { requests, pending } = await loadData(session.userId, isAdmin)

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Leave" }]} />

      <HeroSection
        eyebrow="Cuti & izin"
        title={isAdmin ? "Semua pengajuan cuti." : "Pengajuan cuti saya."}
        subtitle={isAdmin ? `${pending} permintaan menunggu approval` : `${requests.length} pengajuan`}
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="Belum ada pengajuan"
          description={isAdmin ? "Belum ada anggota yang mengajukan cuti." : "Anda belum pernah mengajukan cuti."}
          action={{ label: "Ajukan cuti", href: "/leave/new" }}
        />
      ) : (
        <ul className="space-y-3 list-none p-0" role="list">
          {requests.map((r: any) => {
            const typeMeta = TYPE_META[r.type as keyof typeof TYPE_META] || TYPE_META.personal
            const statusMeta = STATUS_META[r.status as keyof typeof STATUS_META] || STATUS_META.pending
            const TypeIcon = typeMeta.icon
            const startDate = new Date(r.start_date)
            const endDate = new Date(r.end_date)
            const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            return (
              <li
                key={r.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 hover:shadow-md transition motion-lift"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center shrink-0">
                    <TypeIcon className="h-5 w-5 text-[var(--color-brand-500)]" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold">{typeMeta.label}</p>
                        {isAdmin && r.user && (
                          <p className="text-xs text-[var(--color-text-tertiary)]">
                            {r.user.name} · {r.user.position}
                          </p>
                        )}
                      </div>
                      <span className="pill" data-variant={statusMeta.variant}>{statusMeta.label}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        {startDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        {startDate.getTime() !== endDate.getTime() && (
                          <> → {endDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</>
                        )}
                      </span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">{days} hari</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{r.reason}</p>
                    {r.rejection_reason && (
                      <p className="mt-2 text-xs text-[var(--color-danger)]">
                        Alasan ditolak: {r.rejection_reason}
                      </p>
                    )}
                    {isAdmin && r.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <form action={async () => { "use server"; await approve(r.id) }}>
                          <button type="submit" className="btn btn-primary inline-flex items-center gap-1.5 text-sm">
                            <Check className="h-4 w-4" /> Setujui
                          </button>
                        </form>
                        <form action={async () => { "use server"; await reject(r.id, "Tidak disetujui") }}>
                          <button type="submit" className="btn btn-secondary inline-flex items-center gap-1.5 text-sm">
                            <X className="h-4 w-4" /> Tolak
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
