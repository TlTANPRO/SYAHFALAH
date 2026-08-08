// hooks/useBreakpoint.ts
// Match Tailwind breakpoints so components can adapt to mobile vs desktop.
// ssr=false — must be used in client components only.

'use client'

import { useEffect, useState } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide'

const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('desktop')

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth
      if (w < BREAKPOINTS.tablet) setBp('mobile')
      else if (w < BREAKPOINTS.desktop) setBp('tablet')
      else if (w < BREAKPOINTS.wide) setBp('desktop')
      else setBp('wide')
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  return bp
}

export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile'
}
