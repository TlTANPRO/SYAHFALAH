// src\app\(dashboard)\divisi\[divisionId]\leads\page.tsx
import { FeatureRoadmap } from '@/components/layout/FeatureRoadmap'

export default function Page() {
  return (
    <FeatureRoadmap
      title="Leads Pipeline"
      description="Pipeline leads marketing."
      features={[
        'Kanban prospecting → qualified → proposal → won',
      'Per-lead source, value, expected close',
      'Activity timeline & reminder follow-up',
      'Win-rate & average deal size per marketing',
      ]}
      dataSource="leads (planned)"
      related={[
        { label: 'My Tasks', href: '/personal/tasks' },
      ]}
    />
  )
}
