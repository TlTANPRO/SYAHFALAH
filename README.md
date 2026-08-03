# Syahfalah Dashboard

Internal management dashboard for **PT Syahfalah Global** + **PT Lembayung Wanantara Padha** + **Grup Majang Mejeng**.

## 🎯 Features

- **Real-time KPI Cascade** - Company → Division → Personal (4 levels)
- **Task Management** - Daily routines, carry-over, ad-hoc tasks with deadline tracking
- **Morning Briefing** - Automated 07:00 notifications via In-app, Push, WhatsApp
- **Scope of Work (SOW)** - 13 positions with detailed tasks and KPI links
- **RACI Matrix** - Interactive responsibility assignment
- **Rewards & Punishment** - Bonus tracking, SP log, coaching records
- **Notion-like UX** - Inline editing, detail panels, command palette (⌘K)
- **Mobile-First** - PWA support, offline capability
- **Role-Based Access** - Owner, Kepala Kantor, PIC Divisi, Staff

## 🏗 Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database**: Supabase PostgreSQL (Realtime + RLS)
- **Auth**: PIN-based (4-digit) + JWT
- **State**: Zustand + TanStack Query
- **Charts**: Recharts
- **UI**: shadcn/ui + Lucide React
- **Notifications**: Web Push + WhatsApp Cloud API
- **Deploy**: Vercel + Supabase

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Supabase account
- (Optional) WhatsApp Business API, Google Cloud, VAPID keys

### Installation

```bash
# Clone and install
git clone <repo-url>
cd syahfalah-dashboard
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Setup database (run migrations in Supabase SQL Editor)
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Run migrations in order: 001_initial_schema.sql → 006_seed_data.sql

# Start development
pnpm dev
```

### Supabase Setup

1. Create new Supabase project
2. Go to Settings → API to get URL and keys
3. Enable Realtime for tables: `tasks`, `kpis`, `notifications`, `comments`, `rewards_punishments`
4. Run migrations in SQL Editor (001-006)
5. Configure Auth: Disable email signup, enable custom JWT

### Default Login
- **PIN**: `0000` (for all 14 users)
- Users: Pak Ardian (Owner), Bu Nisya, Mada, Riza, Yudi, Amir, Rizal, Novita, Sinta, Reni, Rifki, Reta

## 📁 Project Structure

```
syahfalah-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/login/       # PIN login page
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── owner/          # Owner executive views
│   │   │   ├── kepala-kantor/  # Mada's management views
│   │   │   ├── divisi/         # PIC division views
│   │   │   └── personal/       # Staff personal views
│   │   ├── api/                # API routes
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Sidebar, Topbar, BentoGrid
│   │   ├── kpi/                # KPI cards, cascade, detail
│   │   ├── task/               # Task list, board, calendar
│   │   ├── sow/                # SOW pages
│   │   └── notification/       # Notification bell, briefing
│   ├── lib/
│   │   ├── supabase/           # Supabase clients
│   │   ├── auth/               # PIN hashing, JWT
│   │   └── utils/              # Formatting, helpers
│   ├── stores/                 # Zustand stores
│   ├── providers/              # React context providers
│   ├── hooks/                  # Custom hooks
│   └── types/                  # TypeScript types
├── supabase/
│   ├── migrations/             # 6 SQL migration files
│   └── seed/                   # JSON seed data
└── scripts/                    # Utility scripts
```

## 🔐 Role-Based Access

| Feature | Owner | Kepala Kantor | PIC Divisi | Staff |
|---------|-------|---------------|------------|-------|
| Company KPIs | CRUD | Read | Read | Read |
| Division KPIs | CRUD | CRUD | CRUD (own) | Read |
| Personal KPIs | CRUD | CRUD | CRUD (team) | Update own |
| Tasks | All | All | Division | Own |
| SOW | CRUD | Read | Read (own) | Read |
| Rewards | CRUD | Team | Team | Own |
| Users | CRUD | Read | Team | Own |

## 🔔 Notification System

| Trigger | Channels | Timing |
|---------|----------|--------|
| Morning Brief | In-app + Push + WhatsApp | 07:00 daily |
| Deadline 2h | In-app + Push | T-2 hours |
| Overdue | In-app + Push + WhatsApp | T+0 |
| New Task | In-app + Push | Real-time |
| KPI At Risk | In-app (Managers) | Daily 09:00 |

## 🗄 Database Schema

Key tables: `companies`, `divisions`, `users`, `kpis`, `sows`, `sow_tasks`, `tasks`, `subtasks`, `task_kpis`, `attachments`, `comments`, `notifications`, `rewards_punishments`, `raci_entries`, `reporting_rhythms`, `daily_schedules`, `weekly_plans`, `monthly_targets`

## 📱 PWA Features

- Installable on mobile/desktop
- Offline support with background sync
- Push notifications
- App shortcuts

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repo to Vercel
2. Add environment variables
3. Configure cron jobs in `vercel.json`:
   - `05:00` - Generate daily tasks
   - `07:00` - Send morning briefings
   - `*/15` - Check deadlines
   - `09:00` - Recalculate KPI cascade

### Supabase
- Migrations run via SQL Editor
- Enable RLS policies
- Configure Realtime publication

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## 📝 License

Internal use only - PT Syahfalah Global · PT Lembayung Wanantara Padha · Grup Majang Mejeng

---

**Built by TITAN PRO** | **Branding: Dibuat oleh MADA**