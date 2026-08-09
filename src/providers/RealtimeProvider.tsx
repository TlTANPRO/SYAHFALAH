// providers/RealtimeProvider.tsx
// Realtime subscriptions for tasks, KPIs, notifications, comments.
// v2: Uses useLiveTable for table-specific subscriptions + connection
// dedup. Adds subscriptions for users + divisions live sync.

'use client'

import { type ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useLiveTable } from '@/lib/hooks/use-live-table'

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const userId = user?.id

  // Notifications: self-only (RLS filters automatically)
  useLiveTable({
    table: 'notifications',
    invalidate: userId ? [['notifications', userId], ['notifications-bell']] : [],
    filter: userId ? { user_id: userId } : undefined,
    enabled: !!userId,
    onChange: ({ new: notif }) => {
      if (!notif) return
      const toastType =
        notif.type === 'overdue' || notif.type === 'deadline_approaching'
          ? 'destructive'
          : notif.type === 'kpi_at_risk'
            ? 'warning'
            : 'info'
      addToast({
        type: toastType,
        title: notif.title,
        message: notif.message,
        duration: 8000,
      })
    },
  })

  // Tasks: any change in tasks table (RLS filters to own + division)
  useLiveTable({
    table: 'tasks',
    invalidate: [['tasks']],
    enabled: !!userId,
    onChange: ({ new: task, old: oldTask }) => {
      if (task?.status === 'completed' && oldTask?.status !== 'completed' && task?.title) {
        addToast({ type: 'success', title: 'Task Completed', message: task.title })
      }
    },
  })

  // KPI targets + KPI definitions: live update all KPI views
  useLiveTable({
    table: 'kpi_targets',
    invalidate: [['kpis'], ['owner-kpis'], ['team-kpis'], ['team-personal-kpis'], ['division-kpi-summary'], ['kpi-trend'], ['division-summaries']],
    enabled: !!userId,
  })

  useLiveTable({
    table: 'kpi_definitions',
    invalidate: [['kpis'], ['owner-kpis'], ['team-kpis'], ['division-kpi-summary']],
    enabled: !!userId,
  })

  // Users: live update user management (admin) + notif prefs
  useLiveTable({
    table: 'users',
    invalidate: [['admin-users'], ['users'], ['notif-prefs']],
    enabled: !!userId,
  })

  // Divisions: live update divisions page
  useLiveTable({
    table: 'divisions',
    invalidate: [['divisions'], ['divisions-active'], ['admin-divisions'], ['division']],
    enabled: !!userId,
  })

  // Comments
  useLiveTable({
    table: 'comments',
    invalidate: [['comments']],
    enabled: !!userId,
    onChange: ({ new: comment }) => {
      if (comment?.content) {
        addToast({
          type: 'info',
          title: 'New Comment',
          message: `${comment.content.substring(0, 50)}...`,
        })
      }
    },
  })

  // Leads (sales pipeline) — for marketing CRM live updates
  useLiveTable({
    table: 'leads',
    invalidate: [['leads'], ['marketing-leads'], ['pipeline']],
    enabled: !!userId,
  })

  // Projects — for project management live updates
  useLiveTable({
    table: 'projects',
    invalidate: [['projects'], ['owner-projects']],
    enabled: !!userId,
  })

  // Approvals, audit logs, documents — admin surfaces
  useLiveTable({
    table: 'approvals',
    invalidate: [['approvals']],
    enabled: !!userId,
  })

  useLiveTable({
    table: 'audit_logs',
    invalidate: [['audit-logs']],
    enabled: !!userId,
  })

  useLiveTable({
    table: 'documents',
    invalidate: [['documents']],
    enabled: !!userId,
  })

  useLiveTable({
    table: 'sow_tasks',
    invalidate: [['sows'], ['sow-with-tasks']],
    enabled: !!userId,
  })

  return <>{children}</>
}
