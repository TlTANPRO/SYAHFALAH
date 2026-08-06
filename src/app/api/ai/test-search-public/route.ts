// GET /api/ai/test-search-public — public poke endpoint for JINA API
// key validation. Limited to environment assertion; safe to expose
// (doesn't accept arbitrary queries or return PII).

import { NextResponse } from 'next/server'

export async function GET() {
  const jina = process.env.JINA_API_KEY
  const brave = process.env.BRAVE_API_KEY
  return NextResponse.json({
    jina_configured: !!jina,
    jina_key_length: jina?.length ?? 0,
    jina_key_prefix: jina?.slice(0, 8) ?? null,
    brave_configured: !!brave,
    note: 'length > 0 means the env var is loaded into the Vercel function',
  })
}
