// app/(dashboard)/layout.tsx
// Dashboard layout with sidebar, topbar, and providers

'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { CommandDialog } from '@/components/ui/command-palette'
import { QuickAddDialog } from '@/components/ui/quick-add-dialog'
import { SessionExpiryBanner } from '@/components/auth/SessionExpiryBanner'
import { ToastContainer } from '@/components/ui/toast-container'
import { OfflineStatusBanner } from '@/components/OfflineStatusBanner'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading, isAuthenticated } = useAuthStore()
  const { sidebarCollapsed, isMobile, commandPaletteOpen, setCommandPaletteOpen, openCommandPalette, quickAddOpen, setQuickAddOpen, openQuickAdd } = useUIStore()

  // Rehydrate persisted auth store on mount so middleware-protected pages
  // see isAuthenticated=true on the very first render after a hard nav.
  useEffect(() => {
    useAuthStore.persist.rehydrate()
  }, [])

  // Cmd+Shift+K to open Quick Add (Cmd+K = command palette)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openQuickAdd()
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true } as EventListenerOptions)
  }, [openQuickAdd])

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      // < 768 = mobile (sidebar overlays), >= 768 = sidebar pushes main
      const mobile = window.innerWidth < 768
      useUIStore.getState().setIsMobile(mobile)
      if (mobile) {
        useUIStore.getState().setSidebarOpen(false)
      } else {
        useUIStore.getState().setSidebarOpen(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Loading state
  // BUGFIX 2026-08-22: hard 5s escape hatch. If the store somehow still reports
  // isLoading=true past this point, we render the dashboard anyway — better to
  // show an unauthenticated shell than to leave the user staring at "Memuat
  // dashboard" forever (the prior "unlimited loop" report). The safety timer
  // in AuthProvider should normally clear this in 3s; this is defense in depth.
  const [loadingEscaped, setLoadingEscaped] = useState(false)
  useEffect(() => {
    if (!isLoading) {
      setLoadingEscaped(false)
      return
    }
    const t = window.setTimeout(() => setLoadingEscaped(true), 5000)
    return () => window.clearTimeout(t)
  }, [isLoading])
  if (isLoading && !loadingEscaped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-0)]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return null // Will be handled by middleware
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-0)]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content.
          NOTE: Tailwind v4 source scanner doesn't pick up dynamic class
          strings inside ternary expressions, so `lg:ml-72`/`lg:ml-16`
          were never emitted into the compiled CSS — verified by grep on
          .next/static/css/*.css (0 matches).
          Fix: combine literal Tailwind classes (always scanned) with an
          inline `style` for the dynamic margin, so the layout works
          regardless of which breakpoint class names v4 picked up. */}
      <main
              id="main-content"
              tabIndex={-1}
              className="min-h-screen transition-all duration-300 ease-[var(--ease-out-expo)] focus:outline-none"
              style={{
                marginLeft: isMobile ? 0 : sidebarCollapsed ? 64 : 288,
              }}
            >
        {/* Topbar */}
        <Topbar />

        {/* Page Content */}
        <div className="p-4 lg:p-6 pt-0">
          {children}
        </div>
      </main>
      <SessionExpiryBanner />

      {/* Mobile sidebar overlay */}
      {isMobile && useUIStore.getState().sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => useUIStore.getState().setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Global command palette (⌘K / Ctrl+K) */}
      <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Quick-Add dialog (⌘⇧K / Ctrl+Shift+K) */}
      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />

      {/* Toast notifications (aria-live region inside) */}
      <ToastContainer />

      {/* Offline PWA sync status — visible whenever the user is offline
          or has queued mutations waiting to be replayed. */}
      <OfflineStatusBanner />
      <PWAInstallPrompt />
    </div>
  )
}