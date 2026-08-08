// src/app/(dashboard)/attendance/page.tsx
// Attendance module — daily check-in/check-out for employees.
// Owner + KK can see all; staff can check in themselves.

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import {
  CheckCircle2,
  Clock,
  XCircle,
  CalendarOff,
  Stethoscope,
  Home,
  LogIn,
  LogOut,
} from "lucide-react"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { HeroSection } from "@/components/layout/HeroSection"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { EmptyState } from "@/components/ui/empty-state"
import { requireRole } from "@/lib/auth/role-guard"

export const dynamic = "force-dynamic"

async function loadData(userId: string, todayISO: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { today: null, history: [], totals: { present: 0, late: 0, absent: 0, leave: 0, sick: 0, remote: 0 } }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: today } = await sb
    .from("attendance_logs")
    .select("id, user_id, log_date, check_in_at, check_out_at, status, notes")
    .eq("user_id", userId)
    .eq("log_date", todayISO)
    .maybeSingle()

  const { data: history } = await sb
    .from("attendance_logs")
    .select("id, log_date, check_in_at, check_out_at, status, notes, user_id")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(30)

  const totals = { present: 0, late: 0, absent: 0, leave: 0, sick: 0, remote: 0 }
  for (const h of history || []) {
    const k = h.status as keyof typeof totals
    if (k in totals) totals[k]++
  }

  return { today, history: history || [], totals }
}

async function checkIn(userId: string) {
  "use server"
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const today = new Date().toISOString().split("T")[0]
  await sb.from("attendance_logs").upsert({
    user_id: userId,
    log_date: today,
    check_in_at: new Date().toISOString(),
    status: "present",
  })
  revalidatePath("/attendance")
}

async function checkOut(userId: string) {
  "use server"
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const today = new Date().toISOString().split("T")[0]
  await sb
    .from("attendance_logs")
    .update({ check_out_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("date", today)
  revalidatePath("/attendance")
}

const STATUS_META: Record<string, { icon: any; label: string; color: string }> = {
  present: { icon: CheckCircle2, label: "Hadir", color: "text-[var(--color-success)]" },
  late: { icon: Clock, label: "Terlambat", color: "text-[var(--color-warning)]" },
  absent: { icon: XCircle, label: "Tidak hadir", color: "text-[var(--color-danger)]" },
  leave: { icon: CalendarOff, label: "Cuti", color: "text-[var(--color-info)]" },
  sick: { icon: Stethoscope, label: "Sakit", color: "text-[var(--color-warning)]" },
  remote: { icon: Home, label: "Remote", color: "text-[var(--color-verdigris-500)]" },
}

export default async function AttendancePage() {
  const session = await requireRole("staff")
  const userId = session.userId

  const todayISO = new Date().toISOString().split("T")[0]
  const { today, history, totals } = await loadData(userId, todayISO)

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Attendance" }]} />

      <HeroSection
        eyebrow="Presensi"
        title="Check-in harian."
        subtitle={new Date(todayISO).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        action={
          <div className="flex gap-2">
            {!today?.check_in_at ? (
              <form action={async () => { "use server"; await checkIn(userId) }}>
                <button type="submit" className="btn btn-primary inline-flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Check-in
                </button>
              </form>
            ) : !today?.check_out_at ? (
              <form action={async () => { "use server"; await checkOut(userId) }}>
                <button type="submit" className="btn btn-primary inline-flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Check-out
                </button>
              </form>
            ) : (
              <span className="pill" data-variant="verdigris">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Hari ini selesai
              </span>
            )}
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={CheckCircle2} label="Hadir" value={totals.present} />
        <StatCard icon={Clock} label="Terlambat" value={totals.late} />
        <StatCard icon={CalendarOff} label="Cuti" value={totals.leave} />
        <StatCard icon={Stethoscope} label="Sakit" value={totals.sick} />
        <StatCard icon={Home} label="Remote" value={totals.remote} />
      </section>

      {today && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6">
          <p className="eyebrow mb-2">Status hari ini</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <LogIn className="h-4 w-4 text-[var(--color-success)]" aria-hidden />
              <span className="text-sm">
                Check-in: {today.check_in_at ? new Date(today.check_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-[var(--color-warning)]" aria-hidden />
              <span className="text-sm">
                Check-out: {today.check_out_at ? new Date(today.check_out_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "Belum"}
              </span>
            </div>
            <span className="pill" data-variant="verdigris">
              {STATUS_META[today.status as keyof typeof STATUS_META]?.label || today.status}
            </span>
          </div>
        </section>
      )}

      <section>
        <PageHeader eyebrow="Riwayat" title="30 hari terakhir" compact />
        {history.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Belum ada presensi"
            description="Belum ada catatan check-in 30 hari terakhir."
          />
        ) : (
          <ul className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] divide-y divide-[var(--color-border)] list-none p-0" role="list">
            {history.map((h: any) => {
              const meta = STATUS_META[h.status as keyof typeof STATUS_META] || STATUS_META.present
              const Icon = meta.icon
              return (
                <li key={h.id} className="flex items-center gap-4 p-4 hover:bg-[var(--color-surface-2)] transition">
                  <Icon className={`h-5 w-5 ${meta.color}`} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {new Date(h.log_date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {h.notes && (
                      <p className="text-xs text-[var(--color-text-tertiary)] truncate">{h.notes}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-[var(--color-text-secondary)] tabular-nums">
                    {h.check_in_at ? new Date(h.check_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    {" → "}
                    {h.check_out_at ? new Date(h.check_out_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                  <span className="pill" data-variant="neutral">{meta.label}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
