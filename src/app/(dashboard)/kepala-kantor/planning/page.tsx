// src\app\(dashboard)\kepala-kantor\planning\page.tsx
import { FeatureRoadmap } from '@/components/layout/FeatureRoadmap'

export default function Page() {
  return (
    <FeatureRoadmap
      title="Planning"
      description="Perencanaan kerja bulanan & kuartalan."
      features={[
        'Planner mingguan/bulanan/kuartalan',
      'KPI assignment rollover antar periode',
      'OKR alignment view',
      'Print-ready PDF',
      ]}
      dataSource="planning_periods (planned)"
      related={[
        { label: 'Team KPIs', href: '/kepala-kantor/team' },
      { label: 'My KPIs', href: '/personal/kpi' },
      ]}
    />
  )
}
