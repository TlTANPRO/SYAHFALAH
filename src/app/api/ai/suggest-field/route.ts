// src/app/api/ai/suggest-field/route.ts
// AI-assisted field suggestions for InlineEdit / FieldForm.
// POST { entity: string, field: string, context: object, partial?: string }
// Returns: { suggestions: string[] } or { suggestion: string }

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { entity, field, partial, context } = body as {
      entity?: string
      field?: string
      partial?: string
      context?: Record<string, unknown>
    }

    if (!entity || !field) {
      return NextResponse.json({ error: 'entity + field required' }, { status: 400 })
    }

    // Smart suggestions based on field name + entity context
    const suggestions: string[] = []

    // Status field suggestions
    if (field === 'status') {
      suggestions.push('on_track', 'at_risk', 'blocked', 'completed', 'pending', 'in_progress')
    }
    // Priority field
    else if (field === 'priority' || field === 'priority_level') {
      suggestions.push('low', 'medium', 'high', 'urgent')
    }
    // Outcome/result
    else if (field === 'result' || field === 'outcome') {
      if (entity === 'surveys') {
        suggestions.push('Tertarik', 'Tidak tertarik', 'Akan follow up', 'Sudah closing', 'Tidak response')
      } else if (entity === 'sp3k') {
        suggestions.push('Disetujui', 'Ditolak', 'Menunggu review', 'Revisi')
      } else {
        suggestions.push('Berhasil', 'Sebagian', 'Gagal', 'Ditunda')
      }
    }
    // Category
    else if (field === 'category' || field === 'kategori') {
      suggestions.push('Internal', 'Eksternal', 'Klien', 'Vendor', 'Pemeliharaan')
    }
    // Notes
    else if (field === 'notes' || field === 'catatan') {
      // Don't pre-fill notes — they should be free-form
      return NextResponse.json({ suggestions: [] })
    }
    // Title / name — return null (free-form)
    else if (field === 'title' || field === 'name' || field === 'full_name') {
      return NextResponse.json({ suggestions: [] })
    }

    // Filter by partial if provided
    let filtered = suggestions
    if (partial && typeof partial === 'string' && partial.trim()) {
      const p = partial.toLowerCase()
      filtered = suggestions.filter((s) => s.toLowerCase().includes(p))
    }

    return NextResponse.json({ 
      suggestions: filtered.slice(0, 6),
      field,
      entity,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}
