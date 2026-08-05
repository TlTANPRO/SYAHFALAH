// app/(dashboard)/layout.tsx
// Dashboard layout with sidebar, topbar, and providers

'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { CommandDialog } from '@/components/ui/command-palette'
import { SessionExpiryBanner } from '@/components/auth/SessionExpiryBanner'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading, isAuthenticated } = useAuthStore()
  const { sidebarCollapsed, isMobile, commandPaletteOpen, setCommandPaletteOpen, openCommandPalette } = useUIStore()

  // Rehydrate persisted auth store on mount so middleware-protected pages
  // see isAuthenticated=true on the very first render after a hard nav.
  useEffect(() => {
    useAuthStore.persist.rehydrate()
  }, [])

  // Handle mobile sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
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
  if (isLoading) {
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
        className="min-h-screen transition-all duration-300 ease-[var(--ease-out-expo)]"
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
    </div>
  )
}