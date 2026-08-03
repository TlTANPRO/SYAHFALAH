// providers/AuthProvider.tsx
// Authentication provider with Supabase integration

'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { User as DomainUser } from '@/types/domain'

interface AuthContextType {
  user: DomainUser | null
  isLoading: boolean
  signIn: (pin: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setLoading, user: storedUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Initial session check
    const initAuth = async () => {
      setIsLoading(true)
      setLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Fetch full user profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (profile) {
          setUser(profile as DomainUser)
        }
      } else if (storedUser) {
        // Use stored user if no session
        setUser(storedUser)
      }
      
      setIsLoading(false)
      setLoading(false)
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (profile) {
          setUser(profile as DomainUser)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setLoading, storedUser, supabase])

  const signIn = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Find user by PIN - we need to verify against all users
      // In production, you'd want to use a more secure approach
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
      
      if (error || !users) {
        return { success: false, error: 'Authentication failed' }
      }

      // Verify PIN against each user (in production, use a proper lookup)
      // For now, we'll use a simple approach with phone/email as identifier
      // This is a simplified version - you'd want proper PIN verification
      
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
        setUser(profile as DomainUser)
      }
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user: storedUser, 
      isLoading, 
      signIn, 
      signOut, 
      refreshUser 
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