// app/(dashboard)/help/page.tsx
// Stub help page — links to this from the sidebar's "Help" menu.
// Will be replaced with real help docs once the Notion-backed help
// system is wired up.

import { Placeholder } from '@/components/layout/Placeholder'

export default function HelpPage() {
  return (
    <Placeholder
      title="Help & Documentation"
      description="Panduan lengkap penggunaan dashboard Syahfalah. Sementara ini masih dalam pengembangan, cek kembali nanti."
      backHref="/"
    />
  )
}