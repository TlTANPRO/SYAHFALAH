// src/app/(dashboard)/employees/[id]/page.tsx
// Employee Profile — detail for one user.

import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  UserCircle,
} from "lucide-react"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { HeroSection } from "@/components/layout/HeroSection"
import { StatCard } from "@/components/layout/StatCard"
import { EmptyState } from "@/components/ui/empty-state"

export const dynamic = "force-dynamic"

async function loadData(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { user: null, division: null, manager: null, stats: null }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: user, error } = await sb
    .from("users")
    .select("id, name, email, phone, position, role, division_id, reports_to, is_active, join_date, avatar_url")
    .eq("id", userId)
    .single()

  if (error || !user) return { user: null, division: null, manager: null, stats: null }

  const { data: division } = user.division_id
    ? await sb.from("divisions").select("id, name, code").eq("id", user.division_id).single()
    : { data: null }

  const { data: manager } = user.reports_to
    ? await sb.from("users").select("id, name, position").eq("id", user.reports_to).single()
    : { data: null }

  const { count: tasksCompleted } = await sb
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "done")

  const { count: tasksTotal } = await sb
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

  return {
    user,
    division,
    manager,
    stats: {
      tasksCompleted: tasksCompleted || 0,
      tasksTotal: tasksTotal || 0,
    },
  }
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  kepala_kantor: "Kepala Kantor",
  pic_divisi: "PIC Divisi",
  staff: "Staff",
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, division, manager, stats } = await loadData(id)

  if (!user) {
    return (
      <div className="space-y-6">
        <Breadcrumbs crumbs={[{ label: "Employees", href: "/employees" }, { label: "Tidak ditemukan" }]} />
        <EmptyState
          icon={UserCircle}
          title="Anggota tidak ditemukan"
          description="ID ini tidak ada atau sudah dinonaktifkan."
          action={{ label: "Kembali ke direktori", href: "/employees" }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Employees", href: "/employees" }, { label: user.name }]} />

      <Link
        href="/employees"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-brand-500)] motion-link"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Kembali ke direktori
      </Link>

      <HeroSection
        eyebrow={ROLE_LABELS[user.role] || user.role}
        title={user.name}
        subtitle={user.position}
        action={
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-aurum-500)] flex items-center justify-center text-white font-bold text-4xl">
            {user.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        }
      />

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Mail}
          label="Email"
          value={user.email || "—"}
        />
        <StatCard
          icon={Phone}
          label="Telepon"
          value={user.phone || "—"}
        />
        <StatCard
          icon={Building2}
          label="Divisi"
          value={division?.name || "Tanpa divisi"}
        />
        <StatCard
          icon={Calendar}
          label="Bergabung"
          value={user.join_date ? new Date(user.join_date).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" }) : "—"}
        />
      </section>

      {manager && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6">
          <p className="eyebrow mb-2">Atasan langsung</p>
          <Link
            href={`/employees/${manager.id}`}
            className="flex items-center gap-3 hover:text-[var(--color-brand-500)] motion-link"
          >
            <div className="h-10 w-10 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-[var(--color-text-tertiary)]" aria-hidden />
            </div>
            <div>
              <p className="font-semibold">{manager.name}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">{manager.position}</p>
            </div>
          </Link>
        </section>
      )}

      {stats && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6">
            <p className="eyebrow mb-1">Tugas selesai</p>
            <p className="text-3xl font-bold text-[var(--color-success)]">
              {stats.tasksCompleted}
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              dari {stats.tasksTotal} total
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6">
            <p className="eyebrow mb-1">Tingkat penyelesaian</p>
            <p className="text-3xl font-bold">
              {stats.tasksTotal > 0
                ? `${Math.round((stats.tasksCompleted / stats.tasksTotal) * 100)}%`
                : "—"}
            </p>
            <div className="mt-2 h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-success)] transition-all"
                style={{
                  width: stats.tasksTotal > 0
                    ? `${(stats.tasksCompleted / stats.tasksTotal) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
