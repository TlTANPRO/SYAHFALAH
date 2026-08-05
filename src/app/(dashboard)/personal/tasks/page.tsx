// app/(dashboard)/personal/tasks/page.tsx
// Personal Tasks Dashboard

'use client'

import { useState } from 'react'
import { CheckCircle, Clock, AlertTriangle, Plus, Filter, ChevronDown, Calendar, Flag, RotateCcw } from 'lucide-react'
import { formatDate, formatRelativeTime, getKPIStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type TaskTab = 'all' | 'routine' | 'carry_over' | 'ad_hoc' | 'overdue'

interface Task {
  id: string
  title: string
  description: string | null
  type: 'daily_routine' | 'weekly_target' | 'monthly_target' | 'ad_hoc' | 'carry_over'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  scheduled_date: string
  due_date: string | null
  completed_at: string | null
  is_carry_over: boolean
  sow_task_id: string | null
}

export default function PersonalTasksPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TaskTab>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch tasks for today
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('scheduled_date', new Date().toISOString().split('T')[0])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Task[]
    },
  })

  // Toggle task status mutation
  const toggleTask = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task['status'] }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          status, 
          completed_at: status === 'completed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  // Filter tasks by tab
  const filteredTasks = tasks?.filter(task => {
    if (activeTab === 'all') return true
    if (activeTab === 'routine') return task.type === 'daily_routine'
    if (activeTab === 'carry_over') return task.is_carry_over
    if (activeTab === 'ad_hoc') return task.type === 'ad_hoc'
    if (activeTab === 'overdue') return task.status === 'overdue'
    return true
  }).filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const tabs: { id: TaskTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'all', label: 'Semua', icon: <CheckCircle className="h-4 w-4" />, count: tasks?.length || 0 },
    { id: 'routine', label: 'Rutin', icon: <RotateCcw className="h-4 w-4" />, count: tasks?.filter(t => t.type === 'daily_routine').length || 0 },
    { id: 'carry_over', label: 'Carry-over', icon: <Flag className="h-4 w-4" />, count: tasks?.filter(t => t.is_carry_over).length || 0 },
    { id: 'ad_hoc', label: 'Tambahan', icon: <Plus className="h-4 w-4" />, count: tasks?.filter(t => t.type === 'ad_hoc').length || 0 },
    { id: 'overdue', label: 'Overdue', icon: <AlertTriangle className="h-4 w-4" />, count: tasks?.filter(t => t.status === 'overdue').length || 0 },
  ]

  const getStatusBadge = (status: Task['status']) => {
    const variants = {
      pending: 'outline' as const,
      in_progress: 'info' as const,
      completed: 'success' as const,
      overdue: 'destructive' as const,
      cancelled: 'outline' as const,
    }
    const labels = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Selesai',
      overdue: 'Overdue',
      cancelled: 'Batal',
    }
    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  const getPriorityBadge = (priority: Task['priority']) => {
    const variants = {
      low: 'outline' as const,
      medium: 'info' as const,
      high: 'warning' as const,
      critical: 'destructive' as const,
    }
    return <Badge variant={variants[priority]} className="text-xs">{priority.charAt(0).toUpperCase() + priority.slice(1)}</Badge>
  }

  const getTypeBadge = (type: Task['type'], isCarryOver: boolean) => {
    if (isCarryOver) return <Badge variant="warning" className="text-xs">Carry-over</Badge>
    const labels = {
      daily_routine: 'Rutin',
      weekly_target: 'Mingguan',
      monthly_target: 'Bulanan',
      ad_hoc: 'Tambahan',
      carry_over: 'Carry-over',
    }
    return <Badge variant="outline" className="text-xs">{labels[type]}</Badge>
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-20" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Tugas Hari Ini</h1>
          <p className="text-[var(--color-text-secondary)]">{formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Input
              id="tasks-search"
              name="tasks-search"
              placeholder="Cari tugas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10"
            />
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
          </div>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Tugas Baru
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150
              ${activeTab === tab.id 
                ? 'bg-[var(--color-brand-500)] text-primary-foreground shadow-xs' 
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]/50'
              }
            `}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className={`${activeTab === tab.id 
                ? 'bg-primary-foreground/20 text-primary-foreground' 
                : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'} px-2 py-0.5 rounded-full text-xs`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-[var(--color-text-secondary)]/50 mx-auto mb-4" />
              <h3 className="font-medium text-[var(--color-text-primary)] mb-1">Tidak ada tugas</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {activeTab === 'overdue' 
                  ? 'Tidak ada tugas overdue. Bagus!' 
                  : 'Semua tugas telah diselesaikan atau tidak ada jadwal hari ini.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks?.map((task) => (
            <Card key={task.id} className={task.status === 'overdue' ? 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Status Toggle */}
                  <div className="flex items-center gap-2 mt-1">
                    {task.status !== 'completed' && (
                      <button
                        onClick={() => toggleTask.mutate({ 
                          taskId: task.id, 
                          status: task.status === 'pending' ? 'in_progress' : 'completed' 
                        })}
                        className="h-6 w-6 rounded border-2 border-[var(--color-border-default)] hover:border-primary hover:bg-[var(--color-brand-500)]/5 transition-colors flex items-center justify-center"
                        aria-label={task.status === 'pending' ? 'Mulai tugas' : 'Tandai selesai'}
                      >
                        {task.status === 'in_progress' && (
                          <Clock className="h-4 w-4 text-[var(--color-info)]" />
                        )}
                      </button>
                    )}
                    {task.status === 'completed' && (
                      <CheckCircle className="h-6 w-6 text-[var(--color-success)] flex-shrink-0" />
                    )}
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className={task.status === 'completed' ? 'line-through text-[var(--color-text-secondary)]' : 'font-medium text-[var(--color-text-primary)]'}>
                        {task.title}
                      </h3>
                      {getTypeBadge(task.type, task.is_carry_over)}
                      {getPriorityBadge(task.priority)}
                      {getStatusBadge(task.status)}
                    </div>

                    {task.description && (
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)] line-clamp-2">{task.description}</p>
                    )}

                    {/* Meta Info */}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                      {task.due_date && (
                        <span className={task.status === 'overdue' ? 'text-[var(--color-danger)] font-medium' : ''}>
                          <Clock className="h-3 w-3 inline mr-1" />
                          Deadline: {formatDate(task.due_date, { hour: '2-digit', minute: '2-digit' })}
                          {task.status === 'overdue' && ' (OVERDUE)'}
                        </span>
                      )}
                      {task.scheduled_date && (
                        <span>
                          <Calendar className="h-3 w-3 inline mr-1" />
                          Dijadwalkan: {formatDate(task.scheduled_date)}
                        </span>
                      )}
                      {task.is_carry_over && (
                        <Badge variant="warning" className="text-xs">
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Carry-over dari kemarin
                        </Badge>
                      )}
                    </div>

                    {/* Subtasks preview */}
                    {/* Would fetch subtasks here */}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {task.status !== 'completed' && (
                        <>
                          <DropdownMenuItem onClick={() => toggleTask.mutate({ taskId: task.id, status: 'in_progress' })}>
                            <Clock className="h-4 w-4 mr-2" />
                            Mulai
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleTask.mutate({ taskId: task.id, status: 'completed' })}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Tandai Selesai
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Flag className="h-4 w-4 mr-2" />
                        Tunda ke Besok
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Jadikan Carry-over
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-[var(--color-danger)]">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Batalkan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="font-heading text-3xl font-bold text-[var(--color-success)]">{tasks?.filter(t => t.status === 'completed').length || 0}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Selesai</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="font-heading text-3xl font-bold text-[var(--color-info)]">{tasks?.filter(t => t.status === 'in_progress').length || 0}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Sedang Dikerjakan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="font-heading text-3xl font-bold text-[var(--color-warning)]">{tasks?.filter(t => t.is_carry_over).length || 0}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Carry-over</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="font-heading text-3xl font-bold text-[var(--color-danger)]">{tasks?.filter(t => t.status === 'overdue').length || 0}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Overdue</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}