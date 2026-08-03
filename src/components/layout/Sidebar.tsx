// components/layout/Sidebar.tsx
// Sidebar navigation with role-based menu items

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  CheckSquare, 
  FileText, 
  ClipboardList, 
  Award, 
  GitBranch, 
  Calendar, 
  Settings, 
  Shield, 
  BarChart3,
  Menu,
  ChevronLeft,
  ChevronRight,
  Home,
  Building2,
  UserCog,
  ClipboardCheck,
  TrendingUp,
} from 'lucide-react'

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: LayoutDashboard, 
    roles: ['owner', 'kepala_kantor', 'pic_divisi', 'staff'] 
  },
]

const ownerNavigation = [
  { name: 'Executive Overview', href: '/owner', icon: BarChart3, roles: ['owner'] },
  { name: 'Company KPIs', href: '/owner/kpi', icon: Target, roles: ['owner'] },
  { name: 'RACI Matrix', href: '/raci', icon: GitBranch, roles: ['owner'] },
  { name: 'Rewards & Punishment', href: '/rewards', icon: Award, roles: ['owner'] },
  { name: 'Approvals', href: '/owner/approvals', icon: ClipboardCheck, roles: ['owner'] },
  { name: 'Reports', href: '/owner/reports', icon: FileText, roles: ['owner'] },
]

const kepalaKantorNavigation = [
  { name: 'Overview', href: '/kepala-kantor', icon: LayoutDashboard, roles: ['kepala_kantor'] },
  { name: 'Divisi Marketing', href: '/kepala-kantor/divisi/marketing', icon: Users, roles: ['kepala_kantor'] },
  { name: 'Divisi Proyek', href: '/kepala-kantor/divisi/proyek', icon: Building2, roles: ['kepala_kantor'] },
  { name: 'Divisi Operasional', href: '/kepala-kantor/divisi/operasional', icon: ClipboardList, roles: ['kepala_kantor'] },
  { name: 'Divisi Legal', href: '/kepala-kantor/divisi/legal', icon: Shield, roles: ['kepala_kantor'] },
  { name: 'Divisi Media', href: '/kepala-kantor/divisi/media', icon: FileText, roles: ['kepala_kantor'] },
  { name: 'Team KPIs', href: '/kepala-kantor/team', icon: Target, roles: ['kepala_kantor'] },
  { name: 'Coaching Log', href: '/kepala-kantor/coaching', icon: UserCog, roles: ['kepala_kantor'] },
  { name: 'Planning', href: '/kepala-kantor/planning', icon: Calendar, roles: ['kepala_kantor'] },
]

const divisiNavigation = [
  { name: 'Division Dashboard', href: '/divisi/[divisionId]', icon: LayoutDashboard, roles: ['pic_divisi'] },
  { name: 'Division KPIs', href: '/divisi/[divisionId]/kpi', icon: Target, roles: ['pic_divisi'] },
  { name: 'Team KPIs', href: '/divisi/[divisionId]/team', icon: Users, roles: ['pic_divisi'] },
  { name: 'Leads Pipeline', href: '/divisi/[divisionId]/leads', icon: TrendingUp, roles: ['pic_divisi'] },
  { name: 'Content Calendar', href: '/divisi/[divisionId]/content', icon: Calendar, roles: ['pic_divisi'] },
]

const personalNavigation = [
  { name: 'My Dashboard', href: '/personal', icon: LayoutDashboard, roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
  { name: 'My Tasks', href: '/personal/tasks', icon: CheckSquare, roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
  { name: 'My KPIs', href: '/personal/kpi', icon: Target, roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
  { name: 'My SOW', href: '/personal/sow', icon: FileText, roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
  { name: 'My Schedule', href: '/personal/schedule', icon: Calendar, roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
  { name: 'Notifications', href: '/personal/notifications', icon: ClipboardList, roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
]

const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: Users, roles: ['owner'] },
  { name: 'Divisions', href: '/admin/divisions', icon: Building2, roles: ['owner'] },
  { name: 'SOW Editor', href: '/admin/sow', icon: FileText, roles: ['owner'] },
]

const sharedNavigation = [
  { name: 'SOW Library', href: '/sow', icon: FileText, roles: ['owner', 'kepala_kantor', 'pic_divisi', 'staff'] },
  { name: 'KPI Explorer', href: '/kpi', icon: Target, roles: ['owner', 'kepala_kantor', 'pic_divisi', 'staff'] },
  { name: 'RACI Matrix', href: '/raci', icon: GitBranch, roles: ['owner', 'kepala_kantor', 'pic_divisi'] },
  { name: 'Rewards', href: '/rewards', icon: Award, roles: ['owner', 'kepala_kantor', 'pic_divisi', 'staff'] },
  { name: 'Calendar', href: '/calendar', icon: Calendar, roles: ['owner', 'kepala_kantor', 'pic_divisi', 'staff'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['owner', 'kepala_kantor', 'pic_divisi', 'staff'] },
]

export function Sidebar() {
  const { user } = useAuthStore()
  const { sidebarCollapsed, setSidebarCollapsed, toggleSidebar } = useUIStore()
  const pathname = usePathname()
  const [hovered, setHovered] = useState(false)

  if (!user) return null

  const role = user.role
  const divisionId = user.divisionId

  const getNavigationForRole = () => {
    switch (role) {
      case 'owner':
        return [...ownerNavigation, ...sharedNavigation, ...adminNavigation]
      case 'kepala_kantor':
        return [...kepalaKantorNavigation, ...sharedNavigation]
      case 'pic_divisi':
        return [...divisiNavigation.map(item => ({ 
          ...item, 
          href: item.href.replace('[divisionId]', divisionId || '') 
        })), ...sharedNavigation, ...personalNavigation]
      case 'staff':
        return [...personalNavigation, ...sharedNavigation.filter(n => n.roles.includes('staff'))]
      default:
        return [...personalNavigation]
    }
  }

  const navItems = getNavigationForRole()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-full bg-card border-r border-border transition-all duration-300 ease-out-expo',
        sidebarCollapsed ? 'w-16' : 'w-72'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Logo & Toggle */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">Syahfalah</span>
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
            sidebarCollapsed && 'ml-auto'
          )}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary/10 text-primary border-l-4 border-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                sidebarCollapsed && 'justify-center px-2'
              )}
              title={sidebarCollapsed ? item.name : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      {!sidebarCollapsed && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3">
            <img
              src={user.avatarUrl || `/api/avatar?name=${encodeURIComponent(user.name)}`}
              alt={user.name}
              className="h-10 w-10 rounded-full bg-muted object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}