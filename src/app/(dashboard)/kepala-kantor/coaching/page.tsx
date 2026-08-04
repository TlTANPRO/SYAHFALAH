// src\app\(dashboard)\kepala-kantor\coaching\page.tsx
import { FeatureRoadmap } from '@/components/layout/FeatureRoadmap'

export default function Page() {
  return (
    <FeatureRoadmap
      title="Coaching Log"
      description="Catatan coaching & mentoring."
      features={[
        'Log percakapan 1-on-1 (template by role)',
      'Action items & follow-up otomatis ke task',
      'Trend skor engagement staf',
      'Riwayat coaching per anggota',
      ]}
      dataSource="coaching_sessions (planned)"
      related={[
        { label: 'Team KPIs', href: '/kepala-kantor/team' },
      { label: 'My Tasks', href: '/personal/tasks' },
      ]}
    />
  )
}
