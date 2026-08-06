// components/layout/Sidebar.tsx
// Sidebar navigation with Syahfalah brand identity.
// - Brand mark (S logo) at top
// - Sectioned nav (Command, Operation, Library, Admin)
// - Active state with brand accent
// - Collapsible to icon-only

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import {
  BarChart3,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GitBranch,
  Award,
  Settings,
  Activity,
  Link2,
  Megaphone,
  ShoppingCart,
  Wrench,
  Brain,
  Building,
  Target,
  TrendingUp,
  Users,
  UserCog,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

interface NavItem {
  name: string
  href: string
  icon: typeof BarChart3
  roles: string[]
}

const commandNav: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: BarChart3, roles: ['owner', 'kepala_kantor', 'pic_divisi', 'staff'] },
]

const ownerNav: NavItem[] = [
  { name: 'Executive Overview', href: '/owner', icon: BarChart3, roles: ['owner'] },
  { name: 'Company KPIs', href: '/owner/kpi', icon: Target, roles: ['owner'] },
  { name: 'Target Cascade', href: '/owner/targets', icon: GitBranch, roles: ['owner'] },
  { name: 'Marketing CRM', href: '/owner/marketing?tab=customers', icon: Megaphone, roles: ['owner'] },
  { name: 'Project Mgmt', href: '/owner/projects?tab=projects', icon: Building2, roles: ['owner'] },
  { name: 'Purchasing', href: '/owner/purchasing?tab=suppliers', icon: ShoppingCart, roles: ['owner'] },
  { name: 'Maintenance', href: '/owner/maintenance?tab=tickets', icon: Wrench, roles: ['owner'] },
  { name: 'Performance', href: '/owner/performance', icon: TrendingUp, roles: ['owner'] },
  { name: 'AI Copilot', href: '/owner/ai', icon: Brain, roles: ['owner'] },
  { name: 'Cabangs', href: '/owner/cabangs', icon: Building, roles: ['owner'] },
  { name: 'Digital Twin', href: '/owner/twin', icon: Link2, roles: ['owner'] },
  { name: 'Audit Log', href: '/owner/audit', icon: Activity, roles: ['owner'] },
  { name: 'Approvals', href: '/owner/approvals', icon: ClipboardCheck, roles: ['owner'] },
  { name: 'Reports', href: '/owner/reports', icon: FileText, roles: ['owner'] },
]

const kepalaKantorNav: NavItem[] = [
  { name: 'Team KPIs', href: '/kepala-kantor/team', icon: Target, roles: ['kepala_kantor'] },
  { name: 'Coaching Log', href: '/kepala-kantor/coaching', icon: UserCog, roles: ['kepala_kantor'] },
  { name: 'Planning', href: '/kepala-kantor/planning', icon: Calendar, roles: ['kepala_kantor'] },
]

const divisiNav: NavItem[] = [
  { name: 'Division KPIs', href: '/divisi/[divisionId]/kpi', icon: Target, roles: ['pic_divisi'] },
  { name: 'Team KPIs', href: '/divisi/[divisionId]/team', icon: Users, roles: ['pic_divisi'] },
  { name: 'Leads Pipeline', href: '/divisi/[divisionId]/leads', icon: TrendingUp, roles: ['pic_divisi'] },
  { name: 'Content Calendar', href: '/divisi/[divisionId]/content', icon: Calendar, roles: ['pic_divisi'] },
]

const personalNav: NavItem[] = [
  { name: 'My Tasks', href: '/personal/tasks', icon: CheckSquare, roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
  { name: 'My KPIs', href: '/personal/kpi', icon: Target, roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
  { name: 'My SOW', href: '/personal/sow', icon: FileText, roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
  { name: 'My Schedule', href: '/personal/schedule', icon: Calendar, roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
  { name: 'Notifications', href: '/personal/notifications', icon: ClipboardList, roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
]

const adminNav: NavItem[] = [
  { name: 'User Management', href: '/admin/users', icon: Users, roles: ['owner'] },
  { name: 'Divisions', href: '/admin/divisions', icon: Building2, roles: ['owner'] },
  { name: 'SOW Editor', href: '/admin/sow', icon: FileText, roles: ['owner'] },
]

const libraryNav: NavItem[] = [
  { name: 'SOW Library', href: '/sow', icon: FileText, roles: ['owner', 'kepala_kantor', 'pic_divisi', 'staff'] },
  { name: 'KPI Explorer', href: '/kpi', icon: Target, roles: ['owner', 'kepala_kantor', 'pic_divisi', 'staff'] },
  { name: 'RACI Matrix', href: '/raci', icon: GitBranch, roles: ['owner', 'kepala_kantor', 'pic_divisi'] },
  { name: 'Rewards', href: '/rewards', icon: Award, roles: ['owner', 'kepala_kantor', 'pic_divisi', 'staff'] },
  { name: 'Calendar', href: '/calendar', icon: Calendar, roles: ['owner', 'kepala_kantor', 'pic_divisi', 'staff'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['owner', 'kepala_kantor', 'pic_divisi', 'staff'] },
]

function resolveLink(href: string, divisionId: string | null): string {
  return href.replace('[divisionId]', divisionId || '')
}

interface SectionProps {
  title: string
  items: NavItem[]
  collapsed: boolean
  pathname: string
  divisionId: string | null
}

function Section({ title, items, collapsed, pathname, divisionId }: SectionProps) {
  return (
    <div className="mb-4">
      {!collapsed && (
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
          {title}
        </div>
      )}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const href = resolveLink(item.href, divisionId)
          const isActive = pathname === href || pathname.startsWith(href + '/')
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150',
                  isActive
                    ? 'bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)] font-medium'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]',
                  collapsed && 'justify-center px-2',
                )}
                title={collapsed ? item.name : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-[var(--color-brand-500)]" />
                )}
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Sidebar() {
  const { user } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const pathname = usePathname()

  if (!user) return null

  const role = user.role
  const divisionId = user.divisionId

  const sections: { title: string; items: NavItem[] }[] = []
  sections.push({ title: 'Command', items: commandNav })
  if (role === 'owner') {
    sections.push({ title: 'Owner', items: ownerNav })
    sections.push({ title: 'Admin', items: adminNav })
  }
  if (role === 'kepala_kantor') sections.push({ title: 'Operations', items: kepalaKantorNav })
  if (role === 'pic_divisi') sections.push({ title: 'Division', items: divisiNav })
  sections.push({ title: 'Personal', items: personalNav.filter((n) => n.roles.includes(role)) })
  sections.push({ title: 'Library', items: libraryNav.filter((n) => n.roles.includes(role)) })

  return (
    <>
    {/* Mobile backdrop */}
    {!sidebarCollapsed && (
      <div
        className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
        onClick={toggleSidebar}
        aria-hidden="true"
      />
    )}
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] transition-[width,transform] duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] flex flex-col',
        // mobile: hidden by default, slide-in when not collapsed
        sidebarCollapsed
          ? 'w-16 -translate-x-full md:translate-x-0'
          : 'w-72 translate-x-0 md:w-64',
      )}
    >
      {/* Brand header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--color-border-subtle)]">
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="brand-mark" aria-hidden="true">S</div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-[var(--color-text-primary)] leading-none">
                Syahfalah
              </span>
              <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mt-0.5">
                Operations
              </span>
            </div>
          </Link>
        )}
        {sidebarCollapsed && (
          <Link href="/" className="brand-mark mx-auto" aria-label="Syahfalah home">
            S
          </Link>
        )}
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation sections */}
      <nav
        className="flex-1 overflow-y-auto scrollbar-thin p-2"
        role="navigation"
        aria-label="Main navigation"
      >
        {sections.map((s) => (
          <Section
            key={s.title}
            title={s.title}
            items={s.items}
            collapsed={sidebarCollapsed}
            pathname={pathname}
            divisionId={divisionId}
          />
        ))}
      </nav>

      {/* Footer: user */}
      {!sidebarCollapsed && (
        <div className="p-3 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3">
            <Image
              src={user.avatarUrl || `/api/avatar?name=${encodeURIComponent(user.name)}`}
              alt={user.name}
              width={36}
              height={36}
              unoptimized
              className="h-9 w-9 rounded-full bg-[var(--color-surface-2)] object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {user.name}
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)] capitalize">
                {user.role.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expand button when collapsed */}
      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          className="p-3 border-t border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] flex justify-center"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </aside>
    </>
  )
}
