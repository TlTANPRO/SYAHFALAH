// hooks/useDashboardData.ts
//
// Lightweight wrappers around the four dashboard queries that each
// page composes directly. Kept separate from useKpiCascade so callers
// that only need a single view (e.g. the SOW page only needs
// sow_with_tasks) don't have to pull in the rest.

import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '@/providers/SupabaseProvider'

export type SowWithTasks = {
  id: string
  position: string
  division_name: string | null
  description: string | null
  task_count: number
  completed_count: number
}

export function useSowWithTasks() {
  const { supabase } = useSupabase()
  return useQuery({
    queryKey: ['sow-with-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sow_with_tasks').select('*')
      if (error) throw error
      return (data ?? []) as SowWithTasks[]
    },
  })
}

export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [] as Notification[]
      const res = await fetch('/api/notifications?limit=20', { credentials: 'include' })
      if (!res.ok) return [] as Notification[]
      return (await res.json()) as Notification[]
    },
    enabled: !!userId,
    refetchInterval: 30_000, // poll every 30s as a Realtime fallback
  })
}

export type Task = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  division_id: string | null
  assignee_id: string | null
  created_at: string
}

export function useTasks(filters?: { assigneeId?: string; divisionId?: string }) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.assigneeId) params.set('mine', 'true')
      const res = await fetch(`/api/tasks?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) return [] as Task[]
      return (await res.json()) as Task[]
    },
  })
}
