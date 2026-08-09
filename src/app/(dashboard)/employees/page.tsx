// src/app/(dashboard)/employees/page.tsx
// Employee Directory — lists all active users dengan search + filter by division/role.

import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import {
  Users,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Search,
  Calendar,
} from "lucide-react"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { HeroSection } from "@/components/layout/HeroSection"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"

export const dynamic = "force-dynamic"

async function loadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { dbReady: false, employees: [], divisions: [] }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: users, error: usersErr } = await sb
    .from("users")
    .select("id, name, email, phone, position, role, division_id, is_active, join_date, avatar_url")
    .eq("is_active", true)
    .order("name", { ascending: true })

  const { data: divisions } = await sb
    .from("divisions")
    .select("id, name")
    .order("name")

  return {
    dbReady: !usersErr,
    employees: users || [],
    divisions: divisions || [],
  }
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  kepala_kantor: "Kepala Kantor",
  pic_divisi: "PIC Divisi",
  staff: "Staff",
}

const ROLE_BADGE: Record<string, "info" | "aurum" | "verdigris" | "neutral"> = {
  owner: "aurum",
  kepala_kantor: "verdigris",
  pic_divisi: "info",
  staff: "neutral",
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; division?: string; role?: string }>
}) {
  const { q = "", division = "", role = "" } = await searchParams
  const { employees, divisions } = await loadData()

  const qLower = q.toLowerCase().trim()
  const filtered = employees.filter((u: any) => {
    if (division && u.division_id !== division) return false
    if (role && u.role !== role) return false
    if (qLower) {
      const haystack = `${u.name} ${u.email || ""} ${u.phone || ""} ${u.position}`.toLowerCase()
      if (!haystack.includes(qLower)) return false
    }
    return true
  })

  const divisionMap = new Map(divisions.map((d: any) => [d.id, d.name]))

  // Group by division
  const grouped: Record<string, any[]> = {}
  for (const u of filtered) {
    const divName = divisionMap.get(u.division_id) || "Tanpa divisi"
    if (!grouped[divName]) grouped[divName] = []
    grouped[divName].push(u)
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Employees" }]} />

      <HeroSection
        eyebrow="Direktori"
        title="Seluruh anggota Syahfalah."
        subtitle={`${employees.length} anggota aktif · ${divisions.length} divisi`}
        action={
          <form className="flex gap-2 flex-wrap" method="GET">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" aria-hidden />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Cari nama, email, posisi…"
                className="pl-10 w-64"
              />
            </div>
            <select name="division" aria-label="Filter divisi" defaultValue={division} className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-sm">
              <option value="">Semua divisi</option>
              {divisions.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select name="role" aria-label="Filter peran" defaultValue={role} className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-sm">
              <option value="">Semua role</option>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button type="submit" className="h-10 px-4 rounded-md bg-[var(--color-brand-600)] text-white text-sm font-medium hover:bg-[var(--color-brand-700)]">
              Filter
            </button>
          </form>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Tidak ada anggota"
          description={qLower || division || role ? "Coba ubah filter atau kata kunci." : "Belum ada anggota aktif."}
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([divName, members]) => (
            <section key={divName} className="space-y-3">
              <PageHeader
                eyebrow={`${members.length} anggota`}
                title={divName}
                compact
              />
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none p-0" role="list">
                {members.map((u: any) => (
                  <li key={u.id}>
                    <Link
                      href={`/employees/${u.id}`}
                      className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 hover:shadow-md hover:border-[var(--color-brand-500)] transition motion-lift"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-aurum-500)] flex items-center justify-center text-white font-semibold text-lg shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[var(--color-text-primary)] truncate">{u.name}</p>
                          <p className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3" aria-hidden />
                            {u.position}
                          </p>
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className={`pill text-[10px]`} data-variant={ROLE_BADGE[u.role] || "neutral"}>
                              {ROLE_LABELS[u.role] || u.role}
                            </span>
                          </div>
                          {u.email && (
                            <p className="mt-2 text-xs text-[var(--color-text-secondary)] flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0" aria-hidden />
                              <span className="truncate">{u.email}</span>
                            </p>
                          )}
                          {u.phone && (
                            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" aria-hidden />
                              {u.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
