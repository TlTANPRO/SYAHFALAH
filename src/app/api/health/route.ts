// app/api/health/route.ts
// Liveness endpoint. Used by uptime monitors and the Vercel dashboard.
// Returns 200 always — never depends on the database so it's a true
// "is the process alive?" check.

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
  })
}
