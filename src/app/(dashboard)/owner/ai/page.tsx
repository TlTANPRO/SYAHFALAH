// app/(dashboard)/owner/ai/page.tsx
// Plan C Phase 3 — AI Copilot chat shell.
// Owner + kepala_kantor only.

import { Brain } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { CopilotChat } from './CopilotChat'

export default function AIPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={[{ label: 'Owner', href: '/owner' }, { label: 'AI Copilot' }]} />

      <div>
        <h1 className="display-lg flex items-center gap-2">
          <Brain className="h-6 w-6 text-[var(--color-brand-500)]" />
          AI Copilot
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Read-only agent powered by Ollama (gemma4:12b, on-device). Bertanya seputar kondisi bisnis.
        </p>
      </div>

      <CopilotChat />
    </div>
  )
}
