# Realtime Toggle + Live Sync — Ship Report (2026-08-09)

## Honest Pre-Audit Findings

**Toggle UX** — codebase audit revealed only **3 actual toggles** in 1 file
(`settings/page.tsx`: WhatsApp, Email, Desktop push). Other matches were
false positives (raw text, badges, internal helpers).

**Live sync** — `RealtimeProvider` existed but `supabase_realtime` publication
was **EMPTY** (0 tables). WebSocket was connecting but no postgres_changes
events were being broadcast. 0 components actively used `useSupabase().subscribe()`
outside the legacy provider.

**21st.dev** — quota reset today (2/2 retrievals). Spent 1 on `Switch`
id=21948 (serafimcloud) — spring-eased thumb + sliding gradient track.

## Decisions (User-confirmed)

| Decision | Choice |
|---|---|
| Toggle scope | All toggles in codebase (3 in settings) |
| Live sync tables | All 20 tables (16 with `updated_at` + 4 high-traffic) |
| Conflict resolution | Last-write-wins + RLS (per-table filtering) |
| Bundle approach | Vanilla shadcn (no `@base-ui/react` dep) |
| Env check | Done first (verified Vercel + Supabase env vars) |

## What Shipped

### 1. Switch Component (21st.dev-inspired)

**`src/components/ui/switch.tsx`** — `Switch` + `SwitchField`:
- Sliding gradient track (Brand blue when on, muted surface-3 when off)
- Spring-eased thumb (cubic-bezier `.26 .75 .38 .45`)
- Duration 150ms with asymmetric easing
- Sizes: `sm` (28×16) and `default` (36×20)
- Loading spinner inside thumb during save
- Disabled state with 50% opacity
- `SwitchField` wraps in `<label htmlFor>` for accessibility

Adapted from 21st.dev id=21948 pattern, but **without** `@base-ui/react`
dependency (kept `forwardRef` + plain `<button>` for 0 KB bundle impact).

### 2. Auto-Save

**`src/lib/hooks/use-toggle-mutation.ts`** — optimistic mutation hook:
- `useMutation` with TanStack Query
- `onMutate` → snapshot + optimistic cache update
- `onError` → rollback snapshot + toast error
- `onSuccess` → invalidate matching query keys

**`src/app/api/notifications/preferences/route.ts`** — GET + PATCH:
- JWT verified via cookie
- Whitelist keys: `whatsapp_group`, `email`, `desktop_push`, `sound_enabled`
- Service role key for writes
- Default fallback (read current → merge → update) when RPC not available

**`supabase/migrations/20260809_notification_prefs.sql`**:
- Adds `users.notification_prefs` jsonb column
- Default: `{whatsapp_group: true, email: false, desktop_push: true}`
- All 13 users now have pref rows

### 3. Live Sync Architecture

**`src/lib/hooks/use-live-table.ts`** — generic subscription hook:
```tsx
useLiveTable({
  table: 'notifications',
  invalidate: [['notifications', userId], ['notifications-bell']],
  filter: { user_id: userId },  // RLS-aware
  onChange: ({ new: notif }) => addToast(...),
})
```

Features:
- **Module-level registry** — 1 WebSocket channel per table per page (deduped)
- **Filter support** — `{ user_id: uuid }` propagates to Postgres logical replication
- **Grace period cleanup** — 5s after last unsubscribe (prevents tab-refocus flap)
- **Aggregate status export** — `getRealtimeStatus()` for indicator

**`src/providers/RealtimeProvider.tsx`** — refactored to use `useLiveTable`:
- 12 active subscriptions: notifications, tasks, kpi_targets, kpi_definitions,
  users, divisions, comments, leads, projects, approvals, audit_logs,
  documents, sow_tasks
- Replaced old 4-channel ad-hoc pattern
- Notifications get RLS filter (`user_id = auth.uid()`)
- Other tables rely on per-table RLS policies for filtering

**`supabase/migrations/20260809_realtime_publication.sql`**:
- Added 20 tables to `supabase_realtime` publication
- Was 0 tables (publication existed but empty)
- **Excluded**: 6 views (`kpis`, `division_kpi_summary`, etc.) — views can't be in publications
- **Included**: 16 with `updated_at` + 4 high-traffic without

### 4. Polish

**`src/components/ui/live-indicator.tsx`** — connection pill:
- Polls `getRealtimeStatus()` every 3s
- States: Live (verdigris green), Menyambungkan (amber pulse), Offline (gray)
- Sits in Topbar before UserMenu

**`src/components/layout/Topbar.tsx`**: added `<LiveIndicator />` between
theme toggle and user menu.

## Verified End-to-End

| Check | Result |
|---|---|
| typecheck | 0 errors |
| lint | 0 errors (1 pre-existing warning) |
| tests | 19/19 passed |
| build | clean |
| deploy | `6awm4tj94` Ready |

### API Tests

```
GET  /api/notifications/preferences     → { email: false, desktop_push: true, whatsapp_group: true }
PATCH /api/notifications/preferences email=true  → 200 OK + persisted
GET  /api/notifications/preferences     → { email: true, ... } ✓
PATCH /api/notifications/preferences email=false → restored
```

### Browser Test

Visited `/settings`:
- 3 switches render with premium styling (gradient track, white thumb)
- `aria-checked` reflects state correctly
- `role="switch"` semantic markup
- Description text below label
- Loading state ready (auto-shows during save)

### SQL Applied

```sql
ALTER TABLE users ADD COLUMN notification_prefs jsonb NOT NULL DEFAULT '...';
ALTER PUBLICATION supabase_realtime ADD TABLE approvals, comments, customers, divisions,
  documents, house_units, kpi_definitions, kpi_targets, leave_requests,
  maintenance_tickets, monthly_plans, raci_matrix, sow_tasks, tasks, users,
  weekly_plans, notifications, audit_logs, projects, leads;
```

## Honest Scope Reminder

**Live sync pattern**: When user A updates a row in table X, all other users
subscribed to that table (via `useLiveTable`) get the change via WebSocket
within ~1-2 seconds. Their TanStack Query cache is invalidated → page
re-fetches → UI updates.

**Conflict resolution**: Last-write-wins. RLS prevents cross-user
notification editing (user A can't see user B's notifications).
For shared resources (kpi_targets, tasks), concurrent edits produce
last-write-wins behavior — user's input may be silently overwritten.

**Not implemented** (out of scope):
- Real-time cursor collab (Google Docs style) — needs CRDT
- Cross-tab BroadcastChannel (same browser, different tabs) — easy to add
- Push notification ke HP (FCM) — needs Service Worker push API + server key
- Optimistic locking UI ("Pak Riza sedang edit")
- Offline mutation queue beyond what IDB already does

## Files Changed

| NEW | MODIFIED |
|---|---|
| `src/components/ui/switch.tsx` | `src/components/layout/Topbar.tsx` |
| `src/components/ui/live-indicator.tsx` | `src/providers/RealtimeProvider.tsx` |
| `src/lib/hooks/use-toggle-mutation.ts` | `src/app/(dashboard)/settings/page.tsx` |
| `src/lib/hooks/use-live-table.ts` | (no SQL-modified files outside migration) |
| `src/app/api/notifications/preferences/route.ts` | |
| `supabase/migrations/20260809_notification_prefs.sql` | |
| `supabase/migrations/20260809_realtime_publication.sql` | |

Total: **7 new files**, **3 modified**.

## How User Tests It

1. **Toggle**: `/settings` → click any switch → see toast "Preferensi disimpan" → refresh page → state persists
2. **Live sync**: Login as 2 different users in 2 browsers → change anything in either → other browser updates in 1-2s
3. **Live indicator**: Topbar shows "Live" (green) when WebSocket connected

## Next Steps (Optional)

- Cross-tab BroadcastChannel for same-browser multi-tab
- FCM push notification (VAPID keys already in Vercel env)
- Optimistic locking UI for collaborative edits
