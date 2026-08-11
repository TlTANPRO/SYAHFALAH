// components/layout/Topbar.tsx
// Top navigation with global search, command palette trigger, notifications,
// theme toggle, and user menu.

'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Moon,
  Sun,
  Plus,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useTheme } from '@/providers/ThemeProvider'
import { NotificationBell } from '@/components/notification/NotificationBell'
import { UserMenu } from '@/components/auth/UserMenu'
import { LiveIndicator } from '@/components/ui/live-indicator'

function formatPath(pathname: string): string {
  if (pathname === '/') return 'Beranda'
  return pathname
    .split('/')
    .filter(Boolean)
    .map(seg => seg.replace(/-/g, ' '))
    .join(' / ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Contextual placeholder for the global search bar.
 * Changes based on current page so users know what they can search for.
 * Falls back to a clean generic hint on pages without specific entities.
 */
function searchPlaceholder(pathname: string): string {
  // Map of pathname patterns → search hint (singular noun, brief).
  // Keep hints under 30 chars for visual balance.
  if (pathname.startsWith('/personal/tasks')) return 'Cari task…'
  if (pathname.startsWith('/owner/marketing')) return 'Cari lead…'
  if (pathname.startsWith('/admin/users')) return 'Cari user…'
  if (pathname.startsWith('/admin/divisions')) return 'Cari divisi…'
  if (pathname.startsWith('/admin/audit')) return 'Cari audit log…'
  if (pathname.startsWith('/owner/projects')) return 'Cari project…'
  if (pathname.startsWith('/kepala-kantor')) return 'Cari laporan…'
  if (pathname.startsWith('/personal')) return 'Cari data pribadi…'
  if (pathname.startsWith('/owner')) return 'Cari di seluruh data…'
  if (pathname.startsWith('/admin')) return 'Cari data admin…'
  return 'Cari…'
}

export function Topbar() {
  const { user } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar, openCommandPalette, openQuickAdd } = useUIStore()
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
    <header className="sticky top-0 z-30 h-16 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-0)]/80 backdrop-blur-md overflow-x-hidden">
          <div className="flex h-full items-center gap-3 px-4 min-w-0">
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
                      placeholder={searchPlaceholder(pathname)}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => openCommandPalette()}
                      className="w-full h-9 pl-10 pr-20 rounded-md bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_3px_var(--color-brand-500)]/20 transition-shadow"
                      aria-label="Global search"
                    />
                    <button
                      type="button"
                      onClick={() => openCommandPalette()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-1.5 min-h-8 h-8 text-[10px] font-mono text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-3)] transition-colors"
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
                  className="sm:hidden h-11 w-11 inline-flex items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
                  aria-label="Buka pencarian"
                  aria-keyshortcuts="Meta+K Control+K"
                >
                  <Search className="h-4 w-4" />
                </button>

                {/* QuickAdd trigger (Cmd+Shift+K) — visible on all sizes */}
                <button
                  type="button"
                  onClick={openQuickAdd}
                  className="h-11 min-w-11 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-md bg-[var(--color-brand-500)] text-white hover:bg-[var(--color-brand-600)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-0)]"
                  aria-label="Buat Cepat (Quick Add)"
                  aria-keyshortcuts="Meta+Shift+K Control+Shift+K"
                  data-testid="topbar-quick-add"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:inline text-sm font-medium">Buat</span>
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-white/30 bg-white/10 px-1.5 min-h-5 text-[10px] font-mono">
                    ⌘⇧K
                  </kbd>
                </button>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="h-11 w-11 inline-flex items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Live indicator */}
          <LiveIndicator />

          {/* User Menu */}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}