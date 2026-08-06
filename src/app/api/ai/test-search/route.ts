// POST /api/ai/test-search — owner-only endpoint to validate web_search
// tool end-to-end. No state mutation; safe to call.
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { web_search, youtube_trending, billboard_hot_100 } from '@/lib/ai/tools'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
    if (payload.role !== 'owner') return NextResponse.json({ error: 'owner only' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const query = String(body.query ?? '').trim()
    if (!query) return NextResponse.json({ error: 'query wajib' }, { status: 400 })

    const t0 = Date.now()
    const search = await web_search({ query, max_results: 5 })
    const yt = await youtube_trending({ region: 'ID' })
    const bb = await billboard_hot_100()

    return NextResponse.json({
      tested_at: new Date().toISOString(),
      total_ms: Date.now() - t0,
      jina_configured: !!process.env.JINA_API_KEY,
      brave_configured: !!process.env.BRAVE_API_KEY,
      web_search: { ok: search.ok, summary_len: search.summary.length, sample: search.summary.slice(0, 600), error: search.error },
      youtube_trending: { ok: yt.ok, summary_len: yt.summary.length, sample: yt.summary.slice(0, 600), error: yt.error },
      billboard_hot_100: { ok: bb.ok, summary_len: bb.summary.length, sample: bb.summary.slice(0, 600), error: bb.error },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
