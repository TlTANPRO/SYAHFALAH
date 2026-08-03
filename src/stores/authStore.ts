// stores/authStore.ts
// Zustand store for authentication state

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, UserRole } from '@/types/domain'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  permissions: string[]
  
  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  hasPermission: (permission: string) => boolean
  hasRole: (roles: UserRole[]) => boolean
  canAccess: (resource: string, action: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      permissions: [],
      
      setUser: (user) => {
        if (user) {
          // Derive permissions from role
          const rolePermissions: Record<UserRole, string[]> = {
            owner: ['*'],
            kepala_kantor: [
              'company:read', 'company:write',
              'division:read', 'division:write',
              'kpi:read', 'kpi:write', 'kpi:approve',
              'task:read', 'task:write', 'task:assign',
              'sow:read', 'sow:write',
              'user:read', 'user:write',
              'reward:read', 'reward:write', 'reward:approve',
              'punishment:read', 'punishment:write',
              'raci:read', 'raci:write',
              'report:read', 'report:write',
              'approval:read', 'approval:approve',
            ],
            pic_divisi: [
              'division:read',
              'kpi:read', 'kpi:write',
              'task:read', 'task:write', 'task:assign',
              'sow:read',
              'user:read',
              'reward:read', 'reward:write',
              'punishment:read',
              'raci:read',
              'report:read', 'report:write',
            ],
            staff: [
              'task:read', 'task:write',
              'kpi:read', 'kpi:update_own',
              'sow:read',
              'user:read_own',
              'reward:read_own',
              'punishment:read_own',
            ],
          }
          
          const permissions = rolePermissions[user.role] || []
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false,
            permissions,
          })
        } else {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            permissions: [],
          })
        }
      },
      
      setLoading: (isLoading) => set({ isLoading }),
      
      logout: () => set({ 
        user: null, 
        isAuthenticated: false, 
        permissions: [],
      }),
      
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
      
      hasPermission: (permission) => {
        const { permissions, user } = get()
        if (!user) return false
        if (permissions.includes('*')) return true
        return permissions.includes(permission)
      },
      
      hasRole: (roles) => {
        const { user } = get()
        if (!user) return false
        return roles.includes(user.role)
      },
      
      canAccess: (resource, action) => {
        const { hasPermission } = get()
        return hasPermission(`${resource}:${action}`) || hasPermission('*')
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
      }),
    }
  )
)