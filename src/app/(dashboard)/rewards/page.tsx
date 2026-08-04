// src\app\(dashboard)\rewards\page.tsx
import { FeatureRoadmap } from '@/components/layout/FeatureRoadmap'

export default function Page() {
  return (
    <FeatureRoadmap
      title="Rewards & Punishment"
      description="Bonus, insentif, dan SP."
      features={[
        'Leaderboard achievement bulanan',
      'Histori reward per-anggota',
      'Manajemen SP & tracking improvement',
      'Payroll integration',
      ]}
      dataSource="rewards (table currently empty)"
      related={[
        { label: 'Team KPIs', href: '/kepala-kantor/team' },
      ]}
    />
  )
}
