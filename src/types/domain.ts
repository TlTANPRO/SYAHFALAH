// types/domain.ts
// Core domain types for the Syahfalah Dashboard

export type UserRole = 'owner' | 'kepala_kantor' | 'pic_divisi' | 'staff'
export type KPILevel = 'company' | 'kepala_kantor' | 'division' | 'personal'
export type KPIStatus = 'on_track' | 'at_risk' | 'off_track' | 'achieved'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskType = 'daily_routine' | 'weekly_target' | 'monthly_target' | 'ad_hoc' | 'carry_over'
export type NotificationType = 
  | 'morning_brief' 
  | 'deadline_approaching' 
  | 'overdue' 
  | 'new_task' 
  | 'carry_over' 
  | 'kpi_at_risk' 
  | 'mention' 
  | 'approval_request'
export type RewardType = 
  | 'bonus_monthly' 
  | 'bonus_quarterly' 
  | 'bonus_yearly' 
  | 'commission' 
  | 'incentive_qc' 
  | 'incentive_closing' 
  | 'incentive_media' 
  | 'promotion' 
  | 'public_recognition' 
  | 'training' 
  | 'flexible_work' 
  | 'physical_gift' 
  | 'coaching' 
  | 'sp1' 
  | 'sp2' 
  | 'sp3'

export interface Company {
  id: string
  name: string
  subsidiaries: string[]
  fiscalYear: string
  createdAt: string
  updatedAt: string
}

export interface Division {
  id: string
  companyId: string
  name: string
  code: string
  description: string | null
  picId: string | null
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  companyId: string
  divisionId: string
  name: string
  email: string | null
  phone: string | null
  role: UserRole
  position: string
  pinHash: string
  pinSalt: string
  avatarUrl: string | null
  isActive: boolean
  joinDate: string
  reportsTo: string | null
  notificationPrefs: NotificationPreferences
  createdAt: string
  updatedAt: string
}

export interface NotificationPreferences {
  morning_brief: ChannelPrefs
  deadline: ChannelPrefs
  overdue: ChannelPrefs
  new_task: ChannelPrefs
  carry_over: ChannelPrefs
  kpi_at_risk: ChannelPrefs
  mention: ChannelPrefs
  approval_request: ChannelPrefs
}

export interface ChannelPrefs {
  in_app: boolean
  push: boolean
  whatsapp: boolean
  email: boolean
}

export interface KPI {
  id: string
  companyId: string
  divisionId: string | null
  userId: string | null
  code: string
  name: string
  description: string | null
  level: KPILevel
  formula: string | null
  target: number
  actual: number
  progress: number
  unit: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  weight: number
  status: KPIStatus
  evidenceRequired: boolean
  evidenceUrls: string[]
  parentKpiId: string | null
  periodStart: string
  periodEnd: string
  createdAt: string
  updatedAt: string
}

export interface SOW {
  id: string
  companyId: string
  divisionId: string
  positionId: string
  positionName: string
  tujuanPosisi: string | null
  picPendamping: string[]
  tools: string[]
  kpiRingkasan: string | null
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SOWTask {
  id: string
  sowId: string
  title: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'as_needed'
  relatedKpiCodes: string[]
  orderIndex: number
  createdAt: string
}

export interface Task {
  id: string
  companyId: string
  divisionId: string
  assigneeId: string
  sowId: string | null
  sowTaskId: string | null
  title: string
  description: string | null
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  scheduledDate: string
  startDate: string | null
  dueDate: string | null
  completedAt: string | null
  estimatedHours: number | null
  actualHours: number | null
  originalTaskId: string | null
  isCarryOver: boolean
  recurrenceRule: string | null
  notifiedMorning: boolean
  notifiedDeadline: boolean
  notifiedOverdue: boolean
  createdAt: string
  updatedAt: string
}

export interface SubTask {
  id: string
  taskId: string
  title: string
  completed: boolean
  orderIndex: number
  createdAt: string
}

export interface TaskKPILink {
  taskId: string
  kpiId: string
  impactWeight: number
}

export interface Attachment {
  id: string
  taskId: string
  fileName: string
  fileUrl: string
  fileType: string | null
  fileSize: number | null
  uploadedBy: string
  createdAt: string
}

export interface Comment {
  id: string
  taskId: string
  userId: string
  parentId: string | null
  content: string
  mentions: string[]
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedEntityType: string | null
  relatedEntityId: string | null
  read: boolean
  sentAt: string
  readAt: string | null
  channel: 'in_app' | 'whatsapp' | 'push' | 'email'
}

export interface NotificationDelivery {
  id: string
  notificationId: string
  channel: 'in_app' | 'whatsapp' | 'push' | 'email'
  success: boolean
  messageId: string | null
  error: string | null
  sentAt: string
}

export interface RewardPunishment {
  id: string
  userId: string
  type: RewardType
  triggerReason: string
  amount: number | null
  description: string | null
  status: 'pending' | 'approved' | 'paid' | 'active' | 'resolved' | 'escalated'
  issuedAt: string
  resolvedAt: string | null
  approvedBy: string | null
}

export interface RACIEntry {
  id: string
  companyId: string
  activity: string
  director: 'R' | 'A' | 'C' | 'I' | '-'
  kepalaKantor: 'R' | 'A' | 'C' | 'I' | '-'
  pic: 'R' | 'A' | 'C' | 'I' | '-'
  staff: 'R' | 'A' | 'C' | 'I' | '-'
  createdAt: string
  updatedAt: string
}

export interface ReportingRhythm {
  id: string
  companyId: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  meetingName: string
  durationMinutes: number
  participants: string[]
  output: string | null
  dayOfWeek: number | null
  dayOfMonth: number | null
  monthOfQuarter: number | null
  createdAt: string
}

export interface PushSubscription {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
  createdAt: string
}

export interface DailySchedule {
  id: string
  userId: string
  date: string
  timeBlocks: TimeBlock[]
  createdAt: string
  updatedAt: string
}

export interface TimeBlock {
  id: string
  startTime: string
  endTime: string
  activity: string
  taskId: string | null
  type: 'routine' | 'meeting' | 'field' | 'admin' | 'reporting'
}

export interface WeeklyPlan {
  id: string
  userId: string
  month: string
  week: number
  activities: string[]
  targets: WeeklyTarget[]
  createdAt: string
  updatedAt: string
}

export interface WeeklyTarget {
  indicator: string
  target: number
}

export interface MonthlyTarget {
  id: string
  userId: string
  month: string
  indicators: MonthlyIndicator[]
  createdAt: string
  updatedAt: string
}

export interface MonthlyIndicator {
  indicator: string
  target: number
  actual: number | null
}

// API Types
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// Query Keys
export const queryKeys = {
  user: (id: string) => ['user', id] as const,
  users: (divisionId?: string) => ['users', divisionId] as const,
  company: (id: string) => ['company', id] as const,
  divisions: (companyId: string) => ['divisions', companyId] as const,
  division: (id: string) => ['division', id] as const,
  kpis: (params: KPIQueryParams) => ['kpis', params] as const,
  kpi: (id: string) => ['kpi', id] as const,
  kpiCascade: (companyId: string, periodStart: string) => ['kpi-cascade', companyId, periodStart] as const,
  tasks: (params: TaskQueryParams) => ['tasks', params] as const,
  task: (id: string) => ['task', id] as const,
  sow: (positionId: string) => ['sow', positionId] as const,
  sows: (divisionId?: string) => ['sows', divisionId] as const,
  notifications: (userId: string, unreadOnly?: boolean) => ['notifications', userId, unreadOnly] as const,
  rewards: (userId?: string) => ['rewards', userId] as const,
  raci: (companyId: string) => ['raci', companyId] as const,
  reportingRhythms: (companyId: string) => ['reporting-rhythms', companyId] as const,
  dailySchedule: (userId: string, date: string) => ['daily-schedule', userId, date] as const,
  weeklyPlans: (userId: string, month: string) => ['weekly-plans', userId, month] as const,
  monthlyTargets: (userId: string, month: string) => ['monthly-targets', userId, month] as const,
}

export interface KPIQueryParams {
  companyId?: string
  divisionId?: string
  userId?: string
  level?: KPILevel
  periodStart?: string
  periodEnd?: string
  status?: KPIStatus
}

export interface TaskQueryParams {
  assigneeId?: string
  divisionId?: string
  status?: TaskStatus
  type?: TaskType
  scheduledDate?: string
  startDate?: string
  endDate?: string
  priority?: TaskPriority
  isCarryOver?: boolean
}

// Form Types
export interface LoginFormData {
  pin: string
}

export interface PinChangeFormData {
  currentPin: string
  newPin: string
  confirmPin: string
}

export interface TaskFormData {
  title: string
  description: string
  type: TaskType
  priority: TaskPriority
  scheduledDate: string
  dueDate: string
  sowId?: string
  sowTaskId?: string
  kpiIds: string[]
  estimatedHours?: number
  recurrenceRule?: string
}

export interface KPIFormData {
  code: string
  name: string
  description: string
  level: KPILevel
  formula: string
  target: number
  unit: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  weight: number
  evidenceRequired: boolean
  parentKpiId?: string
  divisionId?: string
  userId?: string
  periodStart: string
  periodEnd: string
}

export interface SOWFormData {
  positionId: string
  positionName: string
  divisionId: string
  tujuanPosisi: string
  picPendamping: string[]
  tools: string[]
  kpiRingkasan: string
  tasks: SOWTaskFormData[]
}

export interface SOWTaskFormData {
  title: string
  description: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'as_needed'
  relatedKpiCodes: string[]
  orderIndex: number
}

export interface UserFormData {
  name: string
  email: string
  phone: string
  role: UserRole
  position: string
  divisionId: string
  reportsTo?: string
  pin?: string
}

export interface NotificationPrefsFormData {
  morning_brief: ChannelPrefs
  deadline: ChannelPrefs
  overdue: ChannelPrefs
  new_task: ChannelPrefs
  carry_over: ChannelPrefs
  kpi_at_risk: ChannelPrefs
  mention: ChannelPrefs
  approval_request: ChannelPrefs
}

export interface TargetSettingFormData {
  companyTargets: CompanyTarget[]
  divisionTargets: DivisionTarget[]
  personalTargets: PersonalTarget[]
}

export interface CompanyTarget {
  kpiId: string
  target: number
}

export interface DivisionTarget {
  kpiId: string
  target: number
}

export interface PersonalTarget {
  kpiId: string
  target: number
  userId: string
}