// providers/Providers.tsx
// Combined providers wrapper

'use client'

import { QueryProvider } from './QueryProvider'
import { AuthProvider } from './AuthProvider'
import { SupabaseProvider } from './SupabaseProvider'
import { RealtimeProvider } from './RealtimeProvider'
import { ThemeProvider } from './ThemeProvider'
import { Toaster } from 'sonner'
import { type ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SupabaseProvider>
          <AuthProvider>
            <RealtimeProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  classNames: {
                    toast: 'toast',
                    success: 'toast-success',
                    warning: 'toast-warning',
                    error: 'toast-destructive',
                    info: 'toast-info',
                  },
                }}
              />
            </RealtimeProvider>
          </AuthProvider>
        </SupabaseProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}