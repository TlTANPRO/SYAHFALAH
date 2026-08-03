// providers/ThemeProvider.tsx
// Theme provider (dark mode only)

'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface ThemeContextType {
  theme: 'dark'
  // No toggle since dark mode only
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Ensure dark mode is applied
    document.documentElement.classList.add('dark')
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme: 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}