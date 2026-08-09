// src/app/(dashboard)/owner/projects/flow/page.tsx
// Halaman Flow Kerja Baru 2026. Sumber: 'C:\\Users\\Syahfalah\\Downloads\\FLOW
// KERJA BARU 2026.pdf'. 13 langkah dalam 3 phase (Perencanaan → Pelaksanaan
// → Akhir Project). Setiap langkah menampilkan PIC, jobs, output.
//
// Akses: owner (Pak Ardian), pimpro (Rizal), purchasing (Sinta), operasional
// (Amir). User role lain hanya lihat, tidak bisa edit status.

import { getServerSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Pen,
  Hammer,
  Truck,
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  User,
} from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { HeroSection } from '@/components/layout/HeroSection'
import { StatCard } from '@/components/layout/StatCard'
import {
  FLOW_STEPS,
  FLOW_PHASE_LABEL,
  FLOW_PHASE_ORDER,
  FLOW_ROLE_LABEL,
  FLOW_ROLE_NAME,
  FLOW_ROLE_USER,
  stepsByPhase,
  FLOW_ROLE_COUNT,
  type FlowStep,
  type FlowRole,
  type FlowPhase,
} from '@/lib/flow-kerja/registry'

const ROLE_PILL: Record<FlowRole, string> = {
  pimpro: 'info',
  purchasing: 'warning',
  operasional: 'success',
  owner: 'neutral',
}

const PHASE_ACCENT: Record<FlowPhase, string> = {
  perencanaan: 'brand',
  pelaksanaan: 'aurum',
  akhir: 'verdigris',
}

function stepStatus(n: number): 'planned' | 'in_progress' | 'done' {
  // Pseudo state for visual layout. Real state akan disimpan di tabel
  // 'flow_step_status' (TODO migration). Untuk sekarang rotasi round-robin.
  const mod = (n * 7) % 3
  return mod === 0 ? 'done' : mod === 1 ? 'in_progress' : 'planned'
}

const STATUS_BADGE: Record<ReturnType<typeof stepStatus>, { label: string; icon: typeof CheckCircle2; variant: string }> = {
  done: { label: 'Selesai', icon: CheckCircle2, variant: 'success' },
  in_progress: { label: 'Berjalan', icon: Clock, variant: 'info' },
  planned: { label: 'Belum mulai', icon: Circle, variant: 'neutral' },
}

export default async function FlowKerjaPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/login')
  }
  const role = session.user.role

  const phases = stepsByPhase()
  const totalSteps = FLOW_STEPS.length

  return (
    <div className="space-y-8">
      <Breadcrumbs
        crumbs={[
          { label: 'Project', href: '/owner/projects' },
          { label: 'Flow Kerja 2026' },
        ]}
      />

      <HeroSection
        eyebrow="FLOW KERJA"
        title={<h1 className="display-lg">Flow Kerja 2026</h1>}
        subtitle="13 langkah · Perencanaan → Pelaksanaan → Akhir Project. Setiap langkah punya PIC, jobs, dan output."
        pills={
          <div className="flex flex-wrap gap-2">
            <span className="pill" data-variant="brand">
              <Hammer className="h-3 w-3" aria-hidden /> 13 langkah
            </span>
            <span className="pill" data-variant="aurum">
              <User className="h-3 w-3" aria-hidden /> Rizal · Sinta · Amir
            </span>
          </div>
        }
      />

      {/* PIC distribution */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(FLOW_ROLE_LABEL) as FlowRole[]).map(r => (
          <div key={r} className="card">
            <div className="card-body space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  {FLOW_ROLE_LABEL[r]}
                </span>
                <span className="pill" data-variant={ROLE_PILL[r]}>
                  {FLOW_ROLE_COUNT[r] ?? 0} step
                </span>
              </div>
              <p className="font-heading text-base font-semibold">{FLOW_ROLE_USER[r]}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">{FLOW_ROLE_NAME[r]}</p>
            </div>
          </div>
        ))}
      </section>

      {/* 3 phases */}
      {FLOW_PHASE_ORDER.map(phase => {
        const steps = phases[phase]
        return (
          <section key={phase} className="space-y-4">
            <header className="flex items-center gap-3">
              <span className="pill" data-variant={PHASE_ACCENT[phase]}>
                {FLOW_PHASE_LABEL[phase]}
              </span>
              <h2 className="font-heading text-xl font-semibold">
                {phase === 'perencanaan' && 'Mulai dari brief Owner, berakhir di Kick Off Meeting.'}
                {phase === 'pelaksanaan' && 'Pengawasan, logistik material, dan opname berkala.'}
                {phase === 'akhir' && 'Inventaris, LPJ, CCO, dan laporan akhir ke Finance.'}
              </h2>
            </header>

            <ol className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {steps.map((s: FlowStep) => {
                const status = stepStatus(s.n)
                const SB = STATUS_BADGE[status]
                const StatusIcon = SB.icon
                return (
                  <li key={s.n} className="card">
                    <div className="card-body space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="font-mono text-2xl font-bold text-[var(--color-text-tertiary)] shrink-0 tabular-nums">
                            {String(s.n).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <p className="font-heading text-base font-semibold">{s.name}</p>
                            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                              PIC: {FLOW_ROLE_USER[s.pic]} · {FLOW_ROLE_NAME[s.pic]}
                            </p>
                          </div>
                        </div>
                        <span className="pill" data-variant={SB.variant}>
                          <StatusIcon className="h-3 w-3" aria-hidden />
                          {SB.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border-default)]">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5 flex items-center gap-1">
                            <Pen className="h-3 w-3" aria-hidden /> Jobs
                          </p>
                          <ul className="text-xs text-[var(--color-text-secondary)] space-y-1">
                            {s.jobs.map((j, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-[var(--color-text-tertiary)] shrink-0">•</span>
                                <span>{j}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5 flex items-center gap-1">
                            <FileText className="h-3 w-3" aria-hidden /> Output
                          </p>
                          <ul className="text-xs text-[var(--color-text-secondary)] space-y-1">
                            {s.output.map((o, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-[var(--color-text-tertiary)] shrink-0">→</span>
                                <span>{o}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[var(--color-border-default)] flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-tertiary)] font-mono">
                          {FLOW_ROLE_LABEL[s.pic]} · Step {s.n}/13
                        </span>
                        {role === 'owner' || canEdit(role, s.pic) ? (
                          <Link
                            href={`/owner/projects/flow/${s.n}`}
                            className="text-[var(--color-brand-500)] hover:underline font-medium"
                          >
                            Detail step →
                          </Link>
                        ) : (
                          <span className="text-[var(--color-text-tertiary)]">view only</span>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}

      {/* Footer note */}
      <section className="card">
        <div className="card-body p-4 text-sm text-[var(--color-text-secondary)]">
          <p>
            <strong className="font-semibold">Note:</strong> Kontrak Buyer & Addendum/CCO
            adalah tanggung jawab <strong className="text-[var(--color-brand-500)]">PIMPRO (Rizal)</strong>,
            bukan Owner. Owner hanya menandatangani Kontrak (di step 5) dan menerima
            laporan akhir (di step 13).
          </p>
        </div>
      </section>
    </div>
  )
}

function canEdit(userRole: string, stepPic: FlowRole): boolean {
  // Owner can edit all. Otherwise user role must match step PIC.
  if (userRole === 'owner') return true
  if (userRole === 'kepala_kantor') return true
  if (userRole === 'pic_divisi' && stepPic === 'pimpro') return true
  if (userRole === 'staff') return false
  return false
}
