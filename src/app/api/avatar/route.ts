// app/api/avatar/route.ts
// Dynamic avatar generation with initials

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get('name')
  
  if (!name || name === 'undefined' || name === 'null') {
    return new NextResponse(null, { status: 404 })
  }

  // Generate initials from name
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

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