// src\app\(dashboard)\divisi\[divisionId]\content\page.tsx
import { FeatureRoadmap } from '@/components/layout/FeatureRoadmap'

export default function Page() {
  return (
    <FeatureRoadmap
      title="Content Calendar"
      description="Kalender konten per divisi."
      features={[
        'Jadwal posting & deadline konten',
      'Per-status (draft, review, scheduled, published)',
      'Assign PIC + due date',
      'Statistik reach & engagement per konten',
      ]}
      dataSource="content_calendar (planned)"
      related={[
        { label: 'My Tasks', href: '/personal/tasks' },
      ]}
    />
  )
}
