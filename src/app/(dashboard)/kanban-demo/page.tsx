// src/app/(dashboard)/kanban-demo/page.tsx
// Demo page showing 21st.dev Kanban component integration.
// Tasks grouped by status — uses real data from /api/tasks.

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/ui/kanban'
import type { Status } from '@/components/ui/kanban'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { HeroSection } from '@/components/layout/HeroSection'
import { EmptyState } from '@/components/ui/empty-state'
import { ListChecks } from 'lucide-react'

const STATUSES: Status[] = [
  { id: 'pending', name: 'Pending', color: '#94a3b8' },
  { id: 'in_progress', name: 'In Progress', color: '#f59e0b' },
  { id: 'done', name: 'Done', color: '#10b981' },
]

interface Task {
  id: string
  title: string
  status: string
  priority?: string
  due_date?: string
}

export default function KanbanDemoPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'kanban-demo'],
    queryFn: async () => {
      const res = await fetch('/api/tasks?page=1&pageSize=50')
      if (!res.ok) throw new Error('Failed to fetch tasks')
      return res.json() as Promise<{ data: Task[]; total: number }>
    },
  })

  const [tasks, setTasks] = useState<Task[]>([])
  const allTasks = data?.data ?? tasks

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const newStatus = STATUSES.find((s) => s.id === over.id)
    if (!newStatus) return

    setTasks((prev) => {
      const fromData = allTasks.find((t) => t.id === active.id)
      const existing = prev.find((t) => t.id === active.id)
      if (existing) {
        return prev.map((t) =>
          t.id === active.id ? { ...t, status: newStatus.id } : t
        )
      }
      if (fromData) {
        return [...prev, { ...fromData, status: newStatus.id }]
      }
      return prev
    })
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: 'Kanban Demo' }]} />

      <HeroSection
        eyebrow="21st.dev integration"
        title="Kanban board."
        subtitle="Drag-and-drop tasks across status columns. Powered by @dnd-kit (sourced from 21st.dev)."
      />

      {isLoading ? (
        <div className="text-sm text-[var(--color-text-tertiary)]">Memuat tugas...</div>
      ) : allTasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Belum ada tugas"
          description="Belum ada tugas untuk ditampilkan di kanban."
        />
      ) : (
        <KanbanProvider onDragEnd={handleDragEnd}>
          {STATUSES.map((status) => {
            const items = allTasks.filter((t) => t.status === status.id)
            return (
              <KanbanBoard key={status.id} id={status.id}>
                <KanbanHeader name={status.name} color={status.color} />
                <KanbanCards>
                  {items.map((task, idx) => (
                    <KanbanCard
                      key={task.id}
                      id={task.id}
                      name={task.title}
                      parent={status.id}
                      index={idx}
                    >
                      <p className="m-0 font-medium text-sm text-[var(--color-text-primary)] truncate">
                        {task.title}
                      </p>
                      {task.due_date && (
                        <p className="m-0 mt-1 text-xs text-[var(--color-text-tertiary)]">
                          {new Date(task.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </KanbanCard>
                  ))}
                </KanbanCards>
              </KanbanBoard>
            )
          })}
        </KanbanProvider>
      )}
    </div>
  )
}
