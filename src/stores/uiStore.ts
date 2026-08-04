// stores/uiStore.ts
// Zustand store for UI state (sidebars, modals, toasts, etc.)

import { create } from 'zustand'

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Command Palette
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  
  // Detail Panel (Right sidebar)
  detailPanelOpen: boolean
  detailPanelWidth: number
  detailPanelEntity: { type: string; id: string } | null
  openDetailPanel: (entity: { type: string; id: string }) => void
  closeDetailPanel: () => void
  setDetailPanelWidth: (width: number) => void
  
  // Modals
  modals: Record<string, boolean>
  openModal: (key: string) => void
  closeModal: (key: string) => void
  closeAllModals: () => void
  
  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  
  // Mobile
  isMobile: boolean
  setIsMobile: (mobile: boolean) => void
  
  // View mode
  viewMode: 'table' | 'kanban' | 'calendar' | 'list'
  setViewMode: (mode: 'table' | 'kanban' | 'calendar' | 'list') => void
  
  // Loading states
  globalLoading: boolean
  setGlobalLoading: (loading: boolean) => void
  
  // Page transitions
  pageTransition: boolean
  startPageTransition: () => void
  endPageTransition: () => void
}

interface Toast {
  id: string
  type: 'success' | 'warning' | 'destructive' | 'info' | 'default'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

let toastId = 0

export const useUIStore = create<UIState>((set, get) => ({
  // Sidebar
  sidebarOpen: true,
  sidebarCollapsed: false,
  // Toggle the visual state that drives the sidebar's width — i.e. the
  // collapsed flag, not `sidebarOpen` (which is only relevant for the
  // mobile overlay). The previous implementation toggled the wrong
  // variable, so the collapse button had no effect on layout.
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  // Command Palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  
  // Detail Panel
  detailPanelOpen: false,
  detailPanelWidth: 480,
  detailPanelEntity: null,
  openDetailPanel: (entity) => set({ 
    detailPanelOpen: true, 
    detailPanelEntity: entity,
  }),
  closeDetailPanel: () => set({ 
    detailPanelOpen: false, 
    detailPanelEntity: null,
  }),
  setDetailPanelWidth: (width) => set({ detailPanelWidth: Math.max(320, Math.min(720, width)) }),
  
  // Modals
  modals: {},
  openModal: (key) => set((state) => ({ 
    modals: { ...state.modals, [key]: true } 
  })),
  closeModal: (key) => set((state) => {
    const modals = { ...state.modals }
    delete modals[key]
    return { modals }
  }),
  closeAllModals: () => set({ modals: {} }),
  
  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastId}-${Date.now()}`
    const newToast = { ...toast, id }
    set((state) => ({ toasts: [...state.toasts, newToast] }))
    
    // Auto-remove
    setTimeout(() => {
      get().removeToast(id)
    }, toast.duration || 5000)
    
    return id
  },
  removeToast: (id) => set((state) => ({ 
    toasts: state.toasts.filter((t) => t.id !== id) 
  })),
  
  // Mobile
  isMobile: false,
  setIsMobile: (mobile) => set({ isMobile: mobile }),
  
  // View mode
  viewMode: 'table',
  setViewMode: (mode) => set({ viewMode: mode }),
  
  // Loading
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
  
  // Page transitions
  pageTransition: false,
  startPageTransition: () => set({ pageTransition: true }),
  endPageTransition: () => set({ pageTransition: false }),
}))