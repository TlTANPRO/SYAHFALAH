'use client'

// app/(dashboard)/personal/tasks/page.tsx
// Personal Tasks Dashboard — paginated, real-data-driven.
// `/api/tasks` returns paginated envelope `{ data: Task[], total, page, pageSize }`.
// We use real `is_carry_over` + `status` for categorization (the legacy `type`
// field did not exist in production data — see migration history).

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Clock, AlertTriangle, Plus, Filter, ChevronDown, Calendar, Flag, RotateCcw, Edit3,
  Info} from 'lucide-react'
import { InlineEdit } from '@/components/ui/inline-edit'
import { DetailSheet } from '@/components/ui/detail-sheet'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/Pagination'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HeroSection } from '@/components/layout/HeroSection'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonRow } from '@/components/ui/loading-skeleton'
import { TasksMobileView } from './TasksMobileView'

type TaskTab = 'all' | 'pending' | 'in_progress' | 'overdue' | 'carry_over' | 'completed'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  scheduled_date: string
  due_date: string | null
  completed_at: string | null
  is_carry_over: boolean
  sow_task_id: string | null
}

const PAGE_SIZE = 10

export default function PersonalTasksPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TaskTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [includeTemplate, setIncludeTemplate] = useState(false)
  const [page, setPage] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'all', page, PAGE_SIZE, includeTemplate],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/tasks?page=${page}&pageSize=${PAGE_SIZE}&sort=scheduled_date:desc`, { credentials: 'include' })
        if (!res.ok) return { data: [], total: 0, page: 1, pageSize: PAGE_SIZE }
        const body = await res.json()
        return {
          data: Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [],
          total: typeof body?.total === 'number' ? body.total : 0,
          page: typeof body?.page === 'number' ? body.page : 1,
          pageSize: typeof body?.pageSize === 'number' ? body.pageSize : PAGE_SIZE,
        }
      } catch {
        return { data: [], total: 0, page: 1, pageSize: PAGE_SIZE }
      }
    },
  })

  const tasks = data?.data ?? []
  const total = data?.total ?? 0

  const toggleTask = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task['status'] }) => {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status }),
      })
      if (!res.ok) throw new Error('Failed to update task')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const triggerCarryOver = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, is_carry_over: true }),
      })
      if (!res.ok) throw new Error('Failed to mark carry-over')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const safeTasks = Array.isArray(tasks) ? tasks : []

  // Real-data categorization (no fake `type` field).
  const filteredTasks = safeTasks.filter(task => {
    const matchesSearch = (task.title ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false
    if (activeTab === 'all') return true
    if (activeTab === 'carry_over') return Boolean(task.is_carry_over)
    return task.status === activeTab
  })

  // Counters use the unfiltered list for current page only (within pagination).
  // Real totals via data?.total (whole collection), so tabs show their REAL counts.
  const totalInCollection = data?.total ?? 0
  const tabCounts: Record<TaskTab, number> = {
    all: totalInCollection,
    pending: 0,
    in_progress: 0,
    overdue: 0,
    carry_over: 0,
    completed: 0,
  }
  // Per-page counts (best-effort — for pages >=1 we don't know totals without an extra query).
  // We compute across the visible page; for all-time counts we'd need a /count endpoint.
  safeTasks.forEach(t => {
    if (t.is_carry_over) tabCounts.carry_over++
    if (t.status === 'pending') tabCounts.pending++
    else if (t.status === 'in_progress') tabCounts.in_progress++
    else if (t.status === 'overdue') tabCounts.overdue++
    else if (t.status === 'completed') tabCounts.completed++
  })

  const tabs: { id: TaskTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all',        label: 'Semua',         icon: <CheckCircle className="h-4 w-4" /> },
    { id: 'pending',    label: 'Pending',       icon: <Clock className="h-4 w-4" /> },
    { id: 'in_progress',label: 'In Progress',   icon: <Clock className="h-4 w-4" /> },
    { id: 'overdue',    label: 'Overdue',       icon: <AlertTriangle className="h-4 w-4" /> },
    { id: 'carry_over', label: 'Carry-over',    icon: <Flag className="h-4 w-4" /> },
    { id: 'completed',  label: 'Selesai',       icon: <CheckCircle className="h-4 w-4" /> },
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
    const variants: Record<Task['priority'], 'outline' | 'info' | 'warning' | 'destructive'> = {
      low: 'outline',
      medium: 'info',
      high: 'warning',
      critical: 'destructive',
    }
    return <Badge variant={variants[priority]} className="text-xs">{priority.charAt(0).toUpperCase() + priority.slice(1)}</Badge>
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs crumbs={[{ label: 'Personal', href: '/personal' }, { label: 'Tugas' }]} />
        <div className="hero">
          <div className="relative z-10">
            <div className="skeleton h-3 w-32 mb-3" />
            <div className="skeleton h-10 w-1/2 mb-2" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <Breadcrumbs crumbs={[{ label: 'Personal', href: '/personal' }, { label: 'Tugas' }]} />
      <HeroSection
        eyebrow={<><CheckCircle className="inline h-3 w-3 mr-1" aria-hidden /> Personal</>}
        title={<h1 className="display-lg">Tugas</h1>}
        subtitle={formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        pills={
          <span className="pill" data-variant="brand">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)]" aria-hidden />
            {totalInCollection} total
          </span>
        }
      />
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Label htmlFor="tasks-search" className="sr-only">Cari tugas</Label>
          <Input
            id="tasks-search"
            name="tasks-search"
            placeholder="Cari tugas..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            className="w-64 pl-10"
            aria-label="Cari tugas"
          />
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={includeTemplate}
              onChange={(e) => { setIncludeTemplate(e.target.checked); setPage(1) }}
              className="rounded border-[var(--color-border)]"
              aria-label="Tampilkan tugas template (contoh 2025)"
            />
            <span>Tampilkan template (10K+)</span>
          </label>
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
        </div>
      </div>

      {/* Tab Navigation — count badges now reflect actual data */}
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1) }}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150
              ${activeTab === tab.id
                ? 'bg-[var(--color-brand-500)] text-primary-foreground shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]/50'}
            `}
            aria-pressed={activeTab === tab.id}
          >
            {tab.icon}
            {tab.label}
            {tabCounts[tab.id] > 0 && (
              <span className={`${activeTab === tab.id
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'} px-2 py-0.5 rounded-full text-xs`}>
                {tab.id === 'all' ? totalInCollection : `${tabCounts[tab.id]}/h${page}`}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            variant={searchQuery ? 'search-empty' : 'no-data'}
            eyebrow={activeTab === 'all' ? 'Tugas' : tabs.find(t => t.id === activeTab)?.label ?? 'Tugas'}
            title={
              searchQuery
                ? `Tidak ada hasil untuk "${searchQuery}"`
                : activeTab === 'overdue'
                  ? 'Tidak ada tugas overdue'
                  : 'Belum ada tugas'
            }
            description={
              searchQuery
                ? 'Coba kata kunci lain atau bersihkan pencarian.'
                : activeTab === 'overdue'
                  ? 'Bagus! Tetap jaga ritme kerja Anda.'
                  : 'Tugas baru akan muncul di sini.'
            }
            action={
              searchQuery
                ? { label: 'Hapus pencarian', onClick: () => { setSearchQuery(''); setPage(1) } }
                : undefined
            }
          />
        ) : (
          <>
            <TasksMobileView rows={filteredTasks as any} />
            {filteredTasks.map((task) => (
            <Card key={task.id} className={`group ${task.status === 'overdue' ? 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5' : ''}`}>
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
                      <InlineEdit
                        value={task.title}
                        type="text"
                        aria-label="Judul task"
                        validate={(v) => !String(v).trim() ? 'Judul tidak boleh kosong' : null}
                        onSave={async (newTitle) => {
                          await fetch(`/api/tasks/${task.id}`, {
                            method: 'PATCH',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: newTitle }),
                          })
                          queryClient.invalidateQueries({ queryKey: ['tasks'] })
                        }}
                        className={task.status === 'completed' ? 'line-through text-base text-[var(--color-text-secondary)]' : 'font-medium text-base text-[var(--color-text-primary)]'}
                      />
                      <button
                        onClick={() => { setEditingTask(task); setSheetOpen(true) }}
                        className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-500)] transition-opacity"
                        aria-label="Edit detail"
                      >
                        <Edit3 className="h-3 w-3" />
                        Detail
                      </button>
                      {task.is_carry_over && (
                        <Badge variant="warning" className="text-xs">Carry-over</Badge>
                      )}
                      {getPriorityBadge(task.priority)}
                      {getStatusBadge(task.status)}
                    </div>

                    {task.description && (
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)] line-clamp-2">{task.description}</p>
                    )}

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
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi tugas">
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
                      <DropdownMenuItem onClick={() => triggerCarryOver.mutate(task.id)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Jadikan Carry-over
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-[var(--color-danger)]"
                        onClick={() => toggleTask.mutate({ taskId: task.id, status: 'cancelled' })}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Batalkan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </>)}
      </div>

      {/* Pagination — page-based, real total from /api/tasks */}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
      />

      {/* Detail Sheet for inline editing */}
      <DetailSheet
        table="tasks"
        rowId={editingTask?.id ?? null}
        data={editingTask as unknown as Record<string, unknown>}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="edit"
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
          router.refresh()
        }}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }}
        onDelete={async () => {
          // Use existing PATCH with cancelled status — actual hard-delete would need DELETE endpoint
          await fetch('/api/tasks', {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingTask!.id, status: 'cancelled' }),
          })
        }}
      />
    </div>
  )
}
