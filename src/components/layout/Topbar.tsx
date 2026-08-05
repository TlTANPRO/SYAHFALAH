// components/layout/Topbar.tsx
// Top navigation with global search, command palette trigger, notifications,
// theme toggle, and user menu.

'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Moon,
  Sun,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { NotificationBell } from '@/components/notification/NotificationBell'
import { UserMenu } from '@/components/auth/UserMenu'

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem('syahfalah-theme') as 'dark' | 'light') || 'dark'
  })

  const apply = (next: 'dark' | 'light') => {
    const root = document.documentElement
    if (next === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('syahfalah-theme', next)
    setTheme(next)
  }

  const toggle = () => {
    apply(theme === 'dark' ? 'light' : 'dark')
  }

  return { theme, toggle: () => apply(theme === 'dark' ? 'light' : 'dark') }
}

function formatPath(pathname: string): string {
  if (pathname === '/') return 'Beranda'
  return pathname
    .split('/')
    .filter(Boolean)
    .map(seg => seg.replace(/-/g, ' '))
    .join(' / ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function Topbar() {
  const { user } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar, openCommandPalette } = useUIStore()
  const { theme, toggle: toggleTheme } = useTheme()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')

  if (!user) return null

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      openCommandPalette(searchQuery)
      setSearchQuery('')
    }
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-0)]/80 backdrop-blur-md">
      <div className="flex h-full items-center gap-3 px-4">
        {/* Sidebar Toggle */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {/* Path */}
        <div className="hidden md:flex items-center gap-1.5 text-sm" aria-label="Current path">
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-brand-500)]" />
          <span className="text-[var(--color-text-tertiary)] font-medium">
            {formatPath(pathname)}
          </span>
        </div>

        {/* Global Search — desktop only */}
                <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-xl ml-auto md:ml-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)] pointer-events-none" />
                    <input
                      id="global-search"
                      name="global-search"
                      type="text"
                      autoComplete="off"
                      placeholder="Cari task, KPI, leads, nama…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => openCommandPalette()}
                      className="w-full h-9 pl-10 pr-20 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_3px_var(--color-brand-500)]/20 transition-shadow"
                      aria-label="Global search"
                    />
                    <button
                      type="button"
                      onClick={() => openCommandPalette()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-1.5 h-6 text-[10px] font-mono text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-3)] transition-colors"
                      aria-label="Open command palette"
                      aria-keyshortcuts="Meta+K Control+K"
                    >
                      <span>⌘</span>K
                    </button>
                  </div>
                </form>

                {/* Search icon — mobile only */}
                <button
                  type="button"
                  onClick={() => openCommandPalette()}
                  className="sm:hidden p-2 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
                  aria-label="Buka pencarian"
                  aria-keyshortcuts="Meta+K Control+K"
                >
                  <Search className="h-4 w-4" />
                </button>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* User Menu */}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}