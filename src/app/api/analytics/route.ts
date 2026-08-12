// app/api/analytics/route.ts
// PUSH #4: Expose perf metrics snapshot.
// Owner-only. Returns cache hits, mutation latency, page loads.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { perfTracker } from '@/lib/analytics/perf-tracker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'owner') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  
  return NextResponse.json(perfTracker.snapshot(), {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}