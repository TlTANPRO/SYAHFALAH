// Avatar fallback component.
// Renders photo if URL provided, else initials on color based on name hash.
// Pure presentation component — no API calls.

import { User } from 'lucide-react'

const PALETTE = [
  ['bg-rose-500', 'text-white'],
  ['bg-amber-500', 'text-white'],
  ['bg-emerald-500', 'text-white'],
  ['bg-sky-500', 'text-white'],
  ['bg-violet-500', 'text-white'],
  ['bg-fuchsia-500', 'text-white'],
  ['bg-lime-500', 'text-stone-900'],
  ['bg-cyan-500', 'text-white'],
] as const

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function getInitials(name: string | null | undefined): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface AvatarProps {
  name?: string | null
  photoUrl?: string | null
  src?: string | null
  size?: number
  className?: string
}

export function Avatar({ name, photoUrl, src, size = 32, className = '' }: AvatarProps) {
  const sz = `${size}px`
  const initials = getInitials(name)
  const palette = PALETTE[hashCode(name ?? 'x') % PALETTE.length]
  const photo = photoUrl ?? src

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-medium select-none overflow-hidden ${className}`}
      style={{ width: sz, height: sz, fontSize: size * 0.42 }}
      aria-label={name ?? 'avatar'}
    >
      {photo ? (
        <img src={photo} alt={name ?? ''} className="h-full w-full object-cover" />
      ) : initials ? (
        <div className={`h-full w-full flex items-center justify-center ${palette[0]} ${palette[1]}`}>
          {initials}
        </div>
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-stone-200 text-stone-500">
          <User style={{ width: size * 0.55, height: size * 0.55 }} />
        </div>
      )}
    </div>
  )
}
