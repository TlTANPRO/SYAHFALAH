// providers/AuthProvider.tsx
// Authentication provider with Supabase integration
// The DB row from `public.users` uses snake_case (`full_name`,
// `division_id`, etc.) but the rest of the frontend reads camelCase
// (`name`, `divisionId`). normalizeUser() maps once so consumers
// (Sidebar, Topbar, dashboard pages) don't have to know about the DB.

'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { User as DomainUser } from '@/types/domain'

function normalizeUser(profile: any): DomainUser {
  return {
    ...profile,
    name: profile.full_name,
    divisionId: profile.division_id,
    avatarUrl: profile.avatar_url,
    isActive: profile.is_active,
  } as DomainUser
}

interface AuthContextType {
  user: DomainUser | null
  isLoading: boolean
  signIn: (pin: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Selectors so the Provider only re-renders for the fields it reads.
  // Whole-store subscription + new supabase client on each render caused the
  // init useEffect to re-fire on every render → spinner loop ("Memuat dashboard").
  const setUser = useAuthStore(s => s.setUser)
  const setLoading = useAuthStore(s => s.setLoading)
  const storedUser = useAuthStore(s => s.user)
  const [isLoading, setIsLoading] = useState(false) // Initial false to avoid spinner flash; middleware handles protection
  // Singleton client — createClient() is expensive and would change ref each render.
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false
    // SAFETY: force isLoading=false within 3s so dashboard never hangs on spinner.
    // BUGFIX 2026-08-22: this MUST clear the Zustand store isLoading too. The
    // dashboard layout reads isLoading from useAuthStore() (see app/(dashboard)
    // /layout.tsx), not from this Provider's local state. If initAuth throws or
    // hangs between the setLoading(true) call and the explicit setLoading(false)
    // at the end of the async function, the store stayed true forever and the
    // "Memuat dashboard" spinner never resolved — the user's reported
    // "unlimited loop". Also explicitly logout() when no user is in the store
    // so the layout's !isAuthenticated branch redirects to /login.
    const safetyTimer = setTimeout(() => {
      if (cancelled) return
      console.warn('[AuthProvider] init timeout - forcing loading=false on local + store')
      setIsLoading(false)
      setLoading(false)
      if (!useAuthStore.getState().user) {
        useAuthStore.getState().logout()
      }
    }, 3000)

    const initAuth = async () => {
      setIsLoading(true)
      setLoading(true)

      // Race Supabase getSession against 2s timeout - prevents hangs
      const sessionResult: any = await Promise.race([
        supabase.auth.getSession(),
        new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 2000)),
      ])
      if (cancelled) return
      const session = sessionResult?.data?.session

      if (session?.user) {
        // Fetch full user profile from Supabase
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          setUser(normalizeUser(profile))
        }
      } else if (storedUser) {
        // localStorage has a user from a previous session.
        // Validate against the server because:
        // 1. JWT cookie may have expired (15min TTL).
        // 2. localStorage persists across sessions but server-side cookie does not.
        // 3. Without validation, every fetch fires 401 storms.
        try {
          const { safeFetch } = await import('@/lib/api/safe-fetch')
          const res = await safeFetch('/api/auth/me')
          if (res.ok) {
            const me = await res.json()
            setUser(normalizeUser(me))
          }
          // else: safeFetch already handled 401 (cleared state + redirect)
        } catch {
          // Network error - keep stored user; they can retry on next action
          setUser(storedUser)
        }
      }

      if (cancelled) return
      setIsLoading(false)
      setLoading(false)
      clearTimeout(safetyTimer)
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          setUser(normalizeUser(profile))
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
      clearTimeout(safetyTimer)
    }
    // Intentionally one-shot: setUser/setLoading are stable Zustand setters,
    // supabase is memoized, storedUser read happens once at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)

      if (error || !users) {
        return { success: false, error: 'Authentication failed' }
      }
      return { success: false, error: 'Use PIN login via API route' }
    } catch {
      return { success: false, error: 'Authentication failed' }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    useAuthStore.getState().logout()
  }

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        setUser(normalizeUser(profile))
      }
    }
  }

  return (
    <AuthContext.Provider value={{
      user: storedUser,
      isLoading,
      signIn,
      signOut,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}