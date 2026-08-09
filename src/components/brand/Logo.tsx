// components/brand/Logo.tsx
// Shared Syahfalah brand monogram — used in sidebar, login, PWA icons.
// Single source of truth: 3-pillar OKLCH + geometric S.
// Avoids the duplicate-rect bug from inline SVGs across files.

import { useId, type CSSProperties } from 'react'

export interface LogoProps {
  /** Render size in pixels (square). Default 32. */
  size?: number
  /** Optional className for additional styling. */
  className?: string
  /** Aria label override (defaults to "Syahfalah"). */
  label?: string
  /** Inline style override (e.g. for non-square container). */
  style?: CSSProperties
}

export function Logo({ size = 32, className, label = 'Syahfalah', style }: LogoProps) {
  // Unique gradient IDs to avoid collision when multiple Logos render on same page.
  const uid = useId().replace(/:/g, '')
  const blueId = `l-blue-${uid}`
  const aurumId = `l-aurum-${uid}`
  const verdigrisId = `l-verdigris-${uid}`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={blueId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.55 0.20 260)" />
          <stop offset="100%" stopColor="oklch(0.38 0.18 260)" />
        </linearGradient>
        <linearGradient id={aurumId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.78 0.15 75)" />
          <stop offset="100%" stopColor="oklch(0.62 0.16 75)" />
        </linearGradient>
        <linearGradient id={verdigrisId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.65 0.13 175)" />
          <stop offset="100%" stopColor="oklch(0.50 0.12 175)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${blueId})`} />
      <path d="M0 38 L64 38 L64 40 L0 40 Z" fill={`url(#${aurumId})`} opacity="0.95" />
      <path d="M0 50 L64 50 L64 51 L0 51 Z" fill={`url(#${verdigrisId})`} opacity="0.85" />
      <path
        d="M44 22 Q44 14 32 14 Q20 14 20 22 Q20 30 32 30 Q44 30 44 38 Q44 50 32 50 Q20 50 20 42"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
