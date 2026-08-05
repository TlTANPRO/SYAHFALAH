// components/ui/command.tsx
// Command palette component using cmdk

'use client'

import * as React from 'react'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from 'cmdk'
import { cn } from '@/lib/utils'
import { Search, X, ChevronRight } from 'lucide-react'

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Command>
      <CommandInput placeholder="Ketik perintah atau cari..." />
      <CommandList>
        <CommandEmpty>Perintah tidak ditemukan.</CommandEmpty>
        <CommandGroup heading="Navigasi">
          {[
            { name: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
            { name: 'My Tasks', href: '/personal/tasks', icon: 'CheckSquare' },
            { name: 'My KPIs', href: '/personal/kpi', icon: 'Target' },
            { name: 'Team KPIs', href: '/kepala-kantor/team', icon: 'Users' },
            { name: 'Company KPIs', href: '/owner/kpi', icon: 'BarChart3' },
            { name: 'RACI Matrix', href: '/raci', icon: 'Users' },
            { name: 'Rewards', href: '/rewards', icon: 'Target' },
            { name: 'Calendar', href: '/calendar', icon: 'Calendar' },
            { name: 'Settings', href: '/settings', icon: 'Settings' },
          ].map((cmd) => (
            <CommandItem key={cmd.name} onSelect={() => { window.location.href = cmd.href; }}>
              <span className="h-4 w-4 mr-2" data-lucide={cmd.icon} />
              {cmd.name}
              <span className="ml-auto text-xs text-[var(--color-text-secondary)]">{cmd.href}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Aksi cepat">
          <CommandItem onSelect={() => { }}>
            <span className="h-4 w-4 mr-2" data-lucide="Plus" />
            Tambah Task
          </CommandItem>
          <CommandItem onSelect={() => { }}>
            <span className="h-4 w-4 mr-2" data-lucide="Plus" />
            Tambah KPI
          </CommandItem>
          <CommandItem onSelect={() => { }}>
            <span className="h-4 w-4 mr-2" data-lucide="Bell" />
            Lihat Notifikasi
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}