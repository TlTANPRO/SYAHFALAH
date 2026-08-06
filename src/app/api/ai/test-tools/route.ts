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

  // 3. billboard_hot_100 (with raw response probe)
  try {
    const r = await fetch('https://www.billboard.com/charts/hot-100/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    })
    const status = r.status
    const ct = r.headers.get('content-type') ?? ''
    const body = await r.text()
    const dataSet = body.match(/data-detail-target="\d+"/g) ?? []
    const charCount = body.length
    results.billboard_hot_100 = { ok: false, length: charCount, status, content_type: ct, data_target_count: dataSet.length, sample: body.slice(0, 200), error: status !== 200 ? `HTTP ${status}` : (dataSet.length === 0 ? 'no chart rows' : 'unknown') }
  } catch (e: any) { results.billboard_hot_100 = { ok: false, error: e?.message } }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    total_ms: Date.now() - t0,
    jina_configured: !!process.env.JINA_API_KEY,
    results,
  })
}
