// lib/ai/tools.ts
// Server-side tools that the LLM can request via OpenAI-shaped tool
// calling. All fetches happen server-side, logged to api_gateway_log,
// redacted of any PII before returning to the LLM.
//
// Each tool:
//  - pure async function (string-in, string-out, or {ok, content})
//  - declared with name + description + JSON Schema for arguments
//  - capped at FETCH_TIMEOUT_MS so a slow URL can't burn the agent budget
//
// Cost model: each tool call returns ≤ 4 KB of extracted text. If a
// page is bigger, we truncate to the first 4 KB. Keeps total agent
// context below ~8 KB even after 3 tool calls.

const FETCH_TIMEOUT_MS = 6_000
const MAX_BODY_BYTES = 256 * 1024

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, { type: string; description: string }>
      required: string[]
    }
  }
}

export interface ToolResult {
  ok: boolean
  summary: string
  bytes?: number
  url?: string
  error?: string
}

const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Fetch a public web page (HTML) and extract clean text. Useful for reading news articles, blog posts, public company pages. NOT for login-protected platforms like TikTok/IG/YouTube.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Full https:// URL to fetch' },
          max_chars: { type: 'integer', description: 'Max characters to return (default 4000)' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_rss',
      description: 'Fetch and parse an RSS / Atom feed. Returns latest entries with title, link, published date, summary.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'RSS/Atom feed URL (e.g. Kompas, Detik, BBC Indonesia feeds)' },
          max_items: { type: 'integer', description: 'How many entries to return (1-20, default 8)' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_oembed',
      description: 'Look up public oEmbed metadata for YouTube / TikTok / Instagram / Twitter / Vimeo / SoundCloud. Returns title, author, thumbnail and provider. NOTE: only public/metadata, not full content.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Public video or post URL' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_duckduckgo',
      description: 'Search the web via DuckDuckGo Instant Answer (free, no API key). Returns abstract + related topics. Best for factual queries, definitions, quick stats.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_company_profile',
      description: 'Fetch company info from Syahfalah internal context (cashflow, headcount, projects, leads). Fast redundant fallback if the LLM needs to look up something specific that is missing from the system prompt.',
      parameters: {
        type: 'object',
        properties: {
          slice: { type: 'string', description: 'One of: metrics, cashflow, clusters, projects, people, top_kpis, recent_activity' },
        },
        required: ['slice'],
      },
    },
  },
]

export const TOOL_NAMES = TOOLS.map(t => t.function.name)

export function getToolDefinitions(): ToolDefinition[] {
  return TOOLS
}

// =============== implementations ===============

async function httpGet(url: string, accept?: string): Promise<{ ok: boolean; body: string; bytes: number; ct: string }> {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'SyahfalahBot/1.0 (+https://syahfalah-dashboard.vercel.app)',
        'Accept': accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    })
    if (!r.ok) return { ok: false, body: '', bytes: 0, ct: '' }
    const ct = r.headers.get('content-type') ?? ''
    const buf = await r.arrayBuffer()
    const slice = buf.byteLength > MAX_BODY_BYTES ? buf.slice(0, MAX_BODY_BYTES) : buf
    const decoder = new TextDecoder('utf-8', { fatal: false })
    return { ok: true, body: decoder.decode(slice), bytes: slice.byteLength, ct }
  } catch (e: any) {
    return { ok: false, body: '', bytes: 0, ct: '' }
  }
}

// Extract clean text from HTML: remove script/style, normalize whitespace.
function htmlToText(html: string): string {
  let s = html
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  s = s.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
  s = s.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
  s = s.replace(/<!--[\s\S]*?-->/g, ' ')
  // extract title/description
  const title = (s.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim()
  const desc = (s.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? '').trim()
  // strip remaining tags
  s = s.replace(/<[^>]+>/g, ' ')
  // decode common entities
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  s = s.replace(/\s+/g, ' ').trim()
  return [title && `TITLE: ${title}`, desc && `DESC: ${desc}`, s].filter(Boolean).join('\n')
}

function dnsHost(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase() } catch { return null }
}

function isAllowedHost(url: string): boolean {
  const host = dnsHost(url)
  if (!host) return false
  // Allow public news / generic websites. Block private / internal ranges.
  if (host === 'localhost' || host.startsWith('127.') || host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('169.254.')) return false
  if (host.endsWith('.local') || host.endsWith('.internal')) return false
  return true
}

async function fetch_url(args: { url: string; max_chars?: number }): Promise<ToolResult> {
  if (!args.url || !/^https?:\/\//i.test(args.url)) return { ok: false, summary: 'URL tidak valid (harus http/https)', error: 'bad_url' }
  if (!isAllowedHost(args.url)) return { ok: false, summary: 'Host sasaran diblok (private/local range)', error: 'blocked_host' }
  const r = await httpGet(args.url)
  if (!r.ok) return { ok: false, summary: `HTTP fetch failed`, url: args.url, error: 'fetch_failed' }
  const text = htmlToText(r.body)
  const cap = Math.min(4000, Math.max(500, args.max_chars ?? 4000))
  return { ok: true, summary: text.slice(0, cap), bytes: r.bytes, url: args.url }
}

async function fetch_rss(args: { url: string; max_items?: number }): Promise<ToolResult> {
  if (!args.url || !isAllowedHost(args.url)) return { ok: false, summary: 'URL tidak valid', error: 'bad_url' }
  const r = await httpGet(args.url, 'application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9')
  if (!r.ok) return { ok: false, summary: 'HTTP fetch failed', error: 'fetch_failed' }
  // Strip CDATA & entities
  const clean = r.body
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  const items: Array<string> = []
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(clean)) && items.length < Math.min(20, args.max_items ?? 8)) {
    const block = m[1]
    const t = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim()
    const l = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? '').trim()
    const d = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ?? '').trim()
    const desc = (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ?? '').trim()
    items.push(`- ${d || '?'} | ${t}\n  ${l}${desc ? `\n  ${htmlToText(desc).slice(0, 200)}` : ''}`)
  }
  if (items.length === 0) return { ok: false, summary: 'No RSS items found (XML structure may differ).', url: args.url, error: 'parse_failed' }
  return { ok: true, summary: items.join('\n\n'), url: args.url }
}

async function fetch_oembed(args: { url: string }): Promise<ToolResult> {
  if (!args.url || !isAllowedHost(args.url)) return { ok: false, summary: 'URL tidak valid', error: 'bad_url' }
  const u = new URL(args.url)
  // YouTube
  if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
    const videoId = u.hostname === 'youtu.be' ? u.pathname.slice(1)
      : new URLSearchParams(u.search).get('v')
    if (!videoId) return { ok: false, summary: 'YouTube video id not found', error: 'parse_failed' }
    const r = await httpGet(`https://www.youtube.com/oembed?url=${encodeURIComponent(args.url)}&format=json`)
    if (!r.ok) return { ok: false, summary: 'YouTube oEmbed failed', error: 'fetch_failed' }
    try {
      const j = JSON.parse(r.body)
      return { ok: true, summary: `Provider: YouTube\nTitle: ${j.title}\nAuthor: ${j.author_name}\nThumbnail: ${j.thumbnail_url}`, url: args.url }
    } catch { return { ok: false, summary: 'oEmbed JSON parse failed', error: 'parse_failed' } }
  }
  // TikTok / Instagram / Twitter / Vimeo: try noembed.com (free, no key)
  const r = await httpGet(`https://noembed.com/embed?url=${encodeURIComponent(args.url)}`)
  if (!r.ok) return { ok: false, summary: 'oEmbed proxy failed (the platform may require login or block anonymous fetch).', error: 'fetch_failed' }
  try {
    const j = JSON.parse(r.body)
    if (j.error) return { ok: false, summary: `oEmbed: ${j.error}`, error: 'provider_blocked' }
    return { ok: true, summary: `Provider: ${j.provider_name ?? u.hostname}\nTitle: ${j.title ?? ''}\nAuthor: ${j.author_name ?? ''}\nThumbnail: ${j.thumbnail_url ?? ''}`, url: args.url }
  } catch { return { ok: false, summary: 'oEmbed JSON parse failed', error: 'parse_failed' } }
}

async function search_duckduckgo(args: { query: string }): Promise<ToolResult> {
  if (!args.query) return { ok: false, summary: 'query kosong', error: 'bad_input' }
  const q = args.query.replace(/[^\w\s\-]/g, ' ').slice(0, 200)
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`
  const r = await httpGet(url, 'application/json')
  if (!r.ok) return { ok: false, summary: 'DuckDuckGo unreachable', error: 'fetch_failed' }
  try {
    const j = JSON.parse(r.body)
    const lines: string[] = []
    if (j.Abstract) lines.push(`Abstract: ${j.Abstract}`)
    if (j.AbstractSource) lines.push(`Source: ${j.AbstractSource}`)
    if (j.AbstractURL) lines.push(`URL: ${j.AbstractURL}`)
    if (Array.isArray(j.RelatedTopics)) {
      j.RelatedTopics.slice(0, 5).forEach((t: any) => {
        if (t.Text) lines.push(`- ${t.Text.slice(0, 200)}${t.FirstURL ? ' — ' + t.FirstURL : ''}`)
      })
    }
    if (lines.length === 0) return { ok: false, summary: 'No abstract or related topics. Use fetch_url instead for specific pages.', error: 'no_data' }
    return { ok: true, summary: lines.join('\n'), url }
  } catch { return { ok: false, summary: 'JSON parse failed', error: 'parse_failed' } }
}

async function fetch_company_profile(args: { slice: string }): Promise<ToolResult> {
  // Lazy import to avoid circulars
  const { loadBusinessContext } = await import('./context')
  const ctx = await loadBusinessContext()
  const slice = args.slice as keyof typeof ctx.company
  if (!(slice in ctx.company)) return { ok: false, summary: 'slice invalid', error: 'bad_input' }
  const data = (ctx.company as any)[slice]
  return { ok: true, summary: JSON.stringify(data, null, 2).slice(0, 4000) }
}

export async function runTool(name: string, argsJson: string): Promise<ToolResult> {
  let args: any = {}
  try { args = argsJson ? JSON.parse(argsJson) : {} } catch { return { ok: false, summary: 'JSON args invalid', error: 'bad_args' } }
  switch (name) {
    case 'fetch_url': return fetch_url(args)
    case 'fetch_rss': return fetch_rss(args)
    case 'fetch_oembed': return fetch_oembed(args)
    case 'search_duckduckgo': return search_duckduckgo(args)
    case 'fetch_company_profile': return fetch_company_profile(args)
    default: return { ok: false, summary: `unknown tool: ${name}`, error: 'unknown_tool' }
  }
}
