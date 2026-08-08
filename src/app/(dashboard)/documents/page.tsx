// src/app/(dashboard)/documents/page.tsx
// Documents / SOP library — searchable file library with categories.

import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import {
  FileText,
  FileSpreadsheet,
  File,
  FileImage,
  Search,
  Download,
  Eye,
  Lock,
  Filter,
} from "lucide-react"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { HeroSection } from "@/components/layout/HeroSection"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/empty-state"
import { requireRole } from "@/lib/auth/role-guard"

export const dynamic = "force-dynamic"

const CATEGORIES = {
  sop: { label: "SOP", icon: FileText, variant: "info" },
  policy: { label: "Kebijakan", icon: Lock, variant: "aurum" },
  contract: { label: "Kontrak", icon: FileSpreadsheet, variant: "verdigris" },
  template: { label: "Template", icon: File, variant: "info" },
  report: { label: "Laporan", icon: FileText, variant: "neutral" },
  other: { label: "Lainnya", icon: FileImage, variant: "neutral" },
}

const VIS_META: Record<string, { label: string; variant: string }> = {
  all: { label: "Semua", variant: "neutral" },
  pic_and_up: { label: "PIC ke atas", variant: "info" },
  kk_and_owner: { label: "KK ke atas", variant: "verdigris" },
  owner_only: { label: "Owner only", variant: "aurum" },
}

async function loadData(category: string, q: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { docs: [] }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  let query = sb
    .from("documents")
    .select("id, title, description, category, file_url, mime_type, visibility, version, tags, created_at, uploader:users!documents_uploaded_by_fkey(name)")
    .order("created_at", { ascending: false })
    .limit(100)

  if (category) {
    query = query.eq("category", category)
  }

  const { data: docs } = await query
  const qLower = q.toLowerCase().trim()
  const filtered = (docs || []).filter((d: any) => {
    if (!qLower) return true
    return `${d.title} ${d.description || ""} ${(d.tags || []).join(" ")}`.toLowerCase().includes(qLower)
  })

  return { docs: filtered }
}

function fileIcon(mime: string) {
  if (!mime) return File
  if (mime.startsWith("image/")) return FileImage
  if (mime.includes("sheet") || mime.includes("excel")) return FileSpreadsheet
  return FileText
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  await requireRole("staff")
  const { q = "", category = "" } = await searchParams
  const { docs } = await loadData(category, q)

  // Group by category
  const grouped: Record<string, any[]> = {}
  for (const d of docs) {
    if (!grouped[d.category]) grouped[d.category] = []
    grouped[d.category].push(d)
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Documents" }]} />

      <HeroSection
        eyebrow="Pustaka dokumen"
        title="SOP, kebijakan & kontrak."
        subtitle={`${docs.length} dokumen · ${Object.keys(grouped).length} kategori`}
        action={
          <form method="GET" className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" aria-hidden />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Cari judul, tag…"
                className="h-10 pl-10 pr-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] text-sm w-64"
              />
            </div>
            <select
              name="category"
              defaultValue={category}
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-sm"
            >
              <option value="">Semua kategori</option>
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button type="submit" className="h-10 px-4 rounded-md bg-[var(--color-brand-600)] text-white text-sm font-medium hover:bg-[var(--color-brand-700)]">
              Filter
            </button>
          </form>
        }
      />

      {docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada dokumen"
          description="Library dokumen masih kosong atau coba ubah filter Anda."
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => {
            const catMeta = CATEGORIES[cat as keyof typeof CATEGORIES] || CATEGORIES.other
            const CatIcon = catMeta.icon
            return (
              <section key={cat} className="space-y-3">
                <PageHeader
                  eyebrow={`${items.length} file`}
                  title={catMeta.label}
                  compact
                />
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none p-0" role="list">
                  {items.map((d: any) => {
                    const FileIco = fileIcon(d.mime_type)
                    const visMeta = VIS_META[d.visibility] || VIS_META.all
                    return (
                      <li key={d.id}>
                        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 hover:shadow-md hover:border-[var(--color-brand-500)] transition motion-lift h-full flex flex-col">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="h-10 w-10 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center shrink-0">
                              <FileIco className="h-5 w-5 text-[var(--color-brand-500)]" aria-hidden />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate" title={d.title}>{d.title}</p>
                              {d.description && (
                                <p className="text-xs text-[var(--color-text-tertiary)] mt-1 line-clamp-2">{d.description}</p>
                              )}
                              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                <span className="pill" data-variant={visMeta.variant}>
                                  <Lock className="h-3 w-3 mr-1" aria-hidden />
                                  {visMeta.label}
                                </span>
                                {d.version > 1 && (
                                  <span className="pill" data-variant="neutral">v{d.version}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                            <span className="text-xs text-[var(--color-text-tertiary)] truncate">
                              {d.uploader?.name || "Anonim"} · {new Date(d.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                            </span>
                            <div className="flex gap-1 shrink-0">
                              {d.file_url && (
                                <>
                                  <a
                                    href={d.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-md hover:bg-[var(--color-surface-2)] transition"
                                    aria-label="Lihat"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </a>
                                  <a
                                    href={d.file_url}
                                    download
                                    className="p-1.5 rounded-md hover:bg-[var(--color-surface-2)] transition"
                                    aria-label="Download"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </article>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
