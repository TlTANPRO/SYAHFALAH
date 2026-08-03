// app/(dashboard)/layout.tsx
// Dashboard layout with sidebar, topbar, and providers

'use client'

import { ReactNode, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading, isAuthenticated } = useAuthStore()
  const { sidebarCollapsed, isMobile } = useUIStore()

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return null // Will be handled by middleware
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300 ease-out-expo',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-72',
          isMobile ? 'ml-0' : ''
        )}
      >
        {/* Topbar */}
        <Topbar />

        {/* Page Content */}
        <div className="p-4 lg:p-6 pt-0">
          {children}
        </div>
      </main>

      {/* Mobile sidebar overlay */}
      {isMobile && useUIStore.getState().sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => useUIStore.getState().setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}