// components/layout/Topbar.tsx
// Topbar with search, notifications, user menu

'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Search, 
  Bell, 
  Settings, 
  LogOut, 
  User, 
  HelpCircle,
  LayoutDashboard,
  Target,
  CheckSquare,
  FileText,
  Users,
  Calendar,
  BarChart3,
  X,
  Plus,
  Moon,
} from 'lucide-react'
import { NotificationBell } from '@/components/notification/NotificationBell'

const userNavigation = [
  { name: 'Profile', href: '/settings', icon: User },
  { name: 'Help', href: '/help', icon: HelpCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Topbar() {
  const { user } = useAuthStore()
  const { 
    sidebarCollapsed, 
    toggleSidebar,
    addToast,
  } = useUIStore()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      addToast({
        type: 'info',
        title: 'Search',
        message: `Searching for "${searchQuery}"...`,
      })
      setSearchQuery('')
    }
  }

  if (!user) return null

  const userName = user.name || 'User'
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <header className="sticky top-0 z-30 h-16 bg-card border-b border-border">
      <div className="flex h-full items-center gap-4 px-4">
        {/* Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn('h-10 w-10', sidebarCollapsed && 'ml-2')}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <LayoutDashboard className="h-5 w-5" />
        </Button>

        {/* Global Search */}
        <div className="flex-1 max-w-xl">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate_y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="global-search"
              name="global-search"
              placeholder="Search tasks, KPIs, people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-muted/50 border-border/50 focus:bg-background focus:border-primary"
              aria-label="Global search"
            />
          </form>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Theme Toggle (placeholder - dark mode only) */}
          <Button variant="ghost" size="icon" className="h-10 w-10" disabled>
            <Moon className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 w-10 rounded-full p-0 gap-2" aria-label="User menu">
                <Avatar 
                  src={user.avatarUrl || `/api/avatar?name=${encodeURIComponent(userName)}`}
                  alt={userName}
                  fallback={userInitials}
                  size="md"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-foreground">{userName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">{user.position}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userNavigation.map((item) => (
                <DropdownMenuItem key={item.name} asChild>
                  <Link href={item.href} className="flex items-center gap-2 w-full">
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  addToast({
                    type: 'info',
                    title: 'Logging out...',
                  })
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}