// providers/QueryProvider.tsx
// TanStack Query provider with default configuration

'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode, createContext, useContext } from 'react'

const QueryClientContext = createContext<QueryClient | null>(null)

export function useQueryClient() {
  const client = useContext(QueryClientContext)
  if (!client) {
    throw new Error('useQueryClient must be used within a QueryProvider')
  }
  return client
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors
              if (error instanceof Response && error.status >= 400 && error.status < 500) {
                return false
              }
              return failureCount < 3
            },
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientContext.Provider value={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </QueryClientContext.Provider>
  )
}