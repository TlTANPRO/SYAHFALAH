// src\app\(dashboard)\raci\page.tsx
import { FeatureRoadmap } from '@/components/layout/FeatureRoadmap'

export default function Page() {
  return (
    <FeatureRoadmap
      title="RACI Matrix"
      description="Matriks tanggung jawab aktivitas."
      features={[
        'View RACI per SOW task',
      'Multi-role assignee per task',
      'Coverage gap detector (no A = R)',
      'Export ke CSV / PDF',
      ]}
      dataSource="raci_matrix (table currently empty)"
      related={[
        { label: 'SOW Library', href: '/sow' },
      { label: 'Team KPIs', href: '/kepala-kantor/team' },
      ]}
    />
  )
}
