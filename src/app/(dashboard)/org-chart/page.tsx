// src/app/(dashboard)/org-chart/page.tsx
// Org Chart — visualizes users.reports_to hierarchy as a tree.
// Uses pure CSS/SVG, no external library needed.

import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import {
  Building2,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { HeroSection } from "@/components/layout/HeroSection"
import { EmptyState } from "@/components/ui/empty-state"
import { requireRole } from "@/lib/auth/role-guard"

export const dynamic = "force-dynamic"

interface OrgNode {
  id: string
  name: string
  position: string
  role: string
  division_id?: string
  division_name?: string
  reports_to?: string | null
  children: OrgNode[]
}

async function loadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { tree: [], divisions: [] }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: users } = await sb
    .from("users")
    .select("id, name, position, role, division_id, reports_to, is_active")
    .eq("is_active", true)

  const { data: divisions } = await sb
    .from("divisions")
    .select("id, name")

  const divMap = new Map((divisions || []).map((d: any) => [d.id, d.name]))

  // Build tree
  const nodeMap = new Map<string, OrgNode>()
  for (const u of users || []) {
    nodeMap.set(u.id, {
      id: u.id,
      name: u.name,
      position: u.position,
      role: u.role,
      division_id: u.division_id,
      division_name: u.division_id ? divMap.get(u.division_id) : undefined,
      reports_to: u.reports_to,
      children: [],
    })
  }

  const roots: OrgNode[] = []
  for (const u of users || []) {
    const node = nodeMap.get(u.id)!
    if (u.reports_to && nodeMap.has(u.reports_to)) {
      nodeMap.get(u.reports_to)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Sort children by name
  function sortChildren(node: OrgNode) {
    node.children.sort((a, b) => a.name.localeCompare(b.name))
    node.children.forEach(sortChildren)
  }
  roots.forEach(sortChildren)

  return { tree: roots, divisions: divisions || [] }
}

function NodeCard({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  return (
    <li className="relative">
      <Link
        href={`/employees/${node.id}`}
        className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 hover:shadow-md hover:border-[var(--color-brand-500)] transition motion-lift min-w-[200px]"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-aurum-500)] flex items-center justify-center text-white font-semibold shrink-0">
            {node.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{node.name}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] truncate">{node.position}</p>
            {node.division_name && (
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 truncate flex items-center gap-1">
                <Building2 className="h-3 w-3" aria-hidden />
                {node.division_name}
              </p>
            )}
          </div>
        </div>
      </Link>

      {node.children.length > 0 && (
        <ul className="mt-4 ml-8 pl-6 border-l-2 border-dashed border-[var(--color-border)] space-y-3 list-none" role="list">
          {node.children.map((child) => (
            <NodeCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default async function OrgChartPage() {
  await requireRole("staff")
  const { tree, divisions } = await loadData()

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Org Chart" }]} />

      <HeroSection
        eyebrow="Struktur organisasi"
        title="Hierarki Syahfalah."
        subtitle={`${tree.reduce((acc, n) => acc + countNodes(n), 0)} anggota · ${divisions.length} divisi`}
      />

      {tree.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada struktur"
          description="Belum ada anggota yang aktif atau belum ada manager yang ditentukan."
        />
      ) : (
        <section className="space-y-4">
          <ul className="space-y-4 list-none p-0" role="list">
            {tree.map((root) => (
              <NodeCard key={root.id} node={root} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function countNodes(n: OrgNode): number {
  return 1 + n.children.reduce((acc, c) => acc + countNodes(c), 0)
}
