// app/api/avatar/route.ts
// Dynamic avatar generation with initials

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const rawName = searchParams.get('name') ?? ''

  // Sanitize: only allow letters/digits/spaces/'-.'  (ASCII subset is enough
  // for Indonesian names — Unicode flag conflicts with current tsconfig)
  const name = rawName.replace(/[^A-Za-z0-9 '\-.]/g, '').slice(0, 60).trim()

  if (!name || name === 'undefined' || name === 'null') {
    return new NextResponse(null, { status: 404 })
  }

  // Generate initials from sanitized name
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map(n => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  // Generate consistent color from name
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const hue = Math.abs(hash) % 360
  const bgColor = `hsl(${hue}, 70%, 45%)`
  const textColor = '#ffffff'

  // Create SVG avatar
  const svg = `
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="${bgColor}" />
      <text 
        x="50" 
        y="62" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="40" 
        font-weight="600" 
        fill="${textColor}" 
        text-anchor="middle"
        dominant-baseline="middle"
      >
        ${initials}
      </text>
    </svg>
  `

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}