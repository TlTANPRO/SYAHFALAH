// GET /api/ai/tools — public tool catalog (transparency).
// Returns the registered tools + their JSON schemas so admins can
// verify what the agent can/can't do.

import { NextResponse } from 'next/server'
import { getToolDefinitions } from '@/lib/ai/tools'

export async function GET() {
  return NextResponse.json({
    tools: getToolDefinitions(),
    privacy: {
      execution: 'server-side only',
      logging: 'api_gateway_log (caller_ip, route, status, duration)',
      max_url_bytes: 262144,
      max_return_chars: 4000,
      blocked_hosts: ['localhost', '127.0.0.1', '10.x', '192.168.x', '169.254.x', '.local', '.internal'],
      rate_limit: 'none today — supplied by Vercel function timeout',
    },
  })
}
