// components/ui/command.tsx
// Command palette + full search. Header "Aksi cepat" dihapus (dead buttons).
// Now: search across pages + entities (tasks, leads, projects, sow, raci).
// Hasil fetch dari /api/search?q= (server-side ILIKE across merged tables).

'use client'

import * as React from 'react'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from 'cmdk'
import { Search, FileText, CheckSquare, Target, Users, Building2, Hammer, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type SearchHit = {
  id: string
  kind: 'task' | 'lead' | 'project' | 'sow' | 'raci' | 'user' | 'division'
  title: string
  subtitle?: string
  href: string
}

const PAGE_NAV = [
  { name: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { name: 'Personal Hub', href: '/personal', icon: 'User' },
  { name: 'My Tasks', href: '/personal/tasks', icon: 'CheckSquare' },
  { name: 'My KPIs', href: '/personal/kpi', icon: 'Target' },
  { name: 'My SOW', href: '/personal/sow', icon: 'BookOpen' },
  { name: 'Team KPIs', href: '/kepala-kantor/team', icon: 'Users' },
  { name: 'Company KPIs', href: '/owner/kpi', icon: 'BarChart3' },
  { name: 'Divisions', href: '/admin/divisions', icon: 'Building2' },
  { name: 'RACI Matrix', href: '/raci', icon: 'Users' },
  { name: 'Rewards', href: '/rewards', icon: 'Target' },
  { name: 'Calendar', href: '/calendar', icon: 'Calendar' },
  { name: 'Settings', href: '/settings', icon: 'Settings' },
]

const KIND_ICON: Record<SearchHit['kind'], typeof Search> = {
  task: CheckSquare,
  lead: Send,
  project: Hammer,
  sow: FileText,
  raci: Users,
  user: Users,
  division: Building2,
}

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  task: 'Task',
  lead: 'Lead',
  project: 'Proyek',
  sow: 'SOW',
  raci: 'RACI',
  user: 'Orang',
  division: 'Divisi',
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = React.useState('')
  const [hits, setHits] = React.useState<SearchHit[]>([])
  const [searching, setSearching] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      // Focus when opened
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setHits([])
    }
  }, [open])

  React.useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      return
    }
    let cancelled = false
    setSearching(true)
    fetch(`/api/search?q=${encodeURIComponent(q)}&limit=12`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        setHits(data.results || [])
      })
      .catch(() => {
        if (!cancelled) setHits([])
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => { cancelled = true }
  }, [query])

  const showPageMatches = query.length >= 2
    ? PAGE_NAV.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : PAGE_NAV

  return (
    <Command shouldFilter={false} label="Command palette">
      <CommandInput
        ref={inputRef}
        placeholder="Cari tugas, lead, proyek, SOW, nama orang..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? 'Mencari...' : query.length >= 2 ? 'Tidak ada hasil.' : 'Ketik minimal 2 huruf untuk mencari.'}
        </CommandEmpty>

        {hits.length > 0 && (
          <CommandGroup heading="Hasil pencarian">
            {hits.map(hit => {
              const Icon = KIND_ICON[hit.kind] ?? Search
              return (
                <CommandItem
                  key={`${hit.kind}-${hit.id}`}
                  value={`${hit.kind}-${hit.title}-${hit.id}`}
                  onSelect={() => { onOpenChange(false); window.location.href = hit.href }}
                >
                  <Icon className="h-4 w-4 mr-2 text-[var(--color-text-tertiary)]" aria-hidden />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm">{hit.title}</span>
                    {hit.subtitle && (
                      <span className="block truncate text-xs text-[var(--color-text-tertiary)]">{hit.subtitle}</span>
                    )}
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)] font-mono uppercase">{KIND_LABEL[hit.kind]}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {showPageMatches.length > 0 && (
          <CommandGroup heading={query.length >= 2 ? 'Halaman yang cocok' : 'Halaman'}>
            {showPageMatches.map(p => (
              <CommandItem
                key={p.name}
                value={`page-${p.name}-${p.href}`}
                onSelect={() => { onOpenChange(false); window.location.href = p.href }}
              >
                <span className="h-4 w-4 mr-2 text-[var(--color-text-tertiary)]" data-lucide={p.icon} aria-hidden />
                <span className="flex-1">{p.name}</span>
                <span className="text-xs text-[var(--color-text-tertiary)] font-mono">{p.href}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  )
}
