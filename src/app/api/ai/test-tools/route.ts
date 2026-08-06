// GET /api/ai/test-tools — public smoke test for the AI tool layer.
// Returns ok/summary/each tool's live output. No auth, no PII.
// Run before deploying a major tool change to validate.

import { NextResponse } from 'next/server'
import { web_search, youtube_trending, billboard_hot_100 } from '@/lib/ai/tools'

export async function GET() {
  const t0 = Date.now()
  const results: Record<string, any> = {}

  // 1. web_search
  try {
    const ws = await web_search({ query: 'lagu trending Indonesia', max_results: 3 })
    results.web_search = { ok: ws.ok, len: ws.summary.length, sample: ws.summary.slice(0, 300), error: ws.error }
  } catch (e: any) { results.web_search = { ok: false, error: e?.message } }

  // 2. youtube_trending (uses kworb.net now)
  try {
    const yt = await youtube_trending({ region: 'ID' })
    results.youtube_trending = { ok: yt.ok, len: yt.summary.length, sample: yt.summary.slice(0, 300), error: yt.error }
  } catch (e: any) { results.youtube_trending = { ok: false, error: e?.message } }

  // 3. billboard_hot_100
  try {
    const bb = await billboard_hot_100()
    results.billboard_hot_100 = { ok: bb.ok, len: bb.summary.length, sample: bb.summary.slice(0, 300), error: bb.error }
  } catch (e: any) { results.billboard_hot_100 = { ok: false, error: e?.message } }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    total_ms: Date.now() - t0,
    jina_configured: !!process.env.JINA_API_KEY,
    results,
  })
}
