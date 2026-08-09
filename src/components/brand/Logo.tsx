// components/brand/Logo.tsx
// Shared Syahfalah brand monogram — used in sidebar, login, PWA icons.
// v2: Clean version — removed aurum (yellow) + verdigris (green) ribbons
// for a single-color Brand Blue gradient with geometric S. Multi-pillar
// ribbon was visually noisy; current design is flagship-tier minimal.

import { type CSSProperties } from 'react'

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
        <linearGradient id="syahfalah-blue" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.55 0.20 260)" />
          <stop offset="100%" stopColor="oklch(0.38 0.18 260)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#syahfalah-blue)" />
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
