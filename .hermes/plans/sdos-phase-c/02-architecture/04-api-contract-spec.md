# API CONTRACT SPEC — Skeleton (Phase 1)

## Existing endpoints (live)

```
POST /api/auth/pin → 200 | 401
POST /api/auth/refresh → 200 | 401
POST /api/auth/logout → 200

GET  /api/notifications?user_id=...&page=...&pageSize=...
PATCH /api/notifications/[id]/read

GET  /api/tasks?q=...&date=...&status=...&page=...&pageSize=...
PATCH /api/tasks/[id]

GET  /api/users?q=...&role=...&division_id=...&page=...&pageSize=...
GET  /api/users/[id]

GET  /api/kpis?q=...&division=...&period=...&page=...&pageSize=...
GET  /api/reports?q=...&page=...&pageSize=...
GET  /api/team?q=...&division=...&page=...&pageSize=...

GET  /api/auth/jwt/refresh
```

## Pattern (consistent across endpoints)

```
GET  /api/<resource>?<filters>
POST /api/<resource>     (create)
PATCH /api/<resource>/[id]   (update)
DELETE /api/<resource>/[id]  (delete)

Response shape:
{
  "data": [...],         // items
  "total": 100,          // total count (paginated)
  "page": 1,             // current page (1-indexed)
  "pageSize": 25         // items per page
}

Error shape:
{
  "error": "human-readable message",
  "code": "ERROR_CODE"
}
```

Auth header:
- Cookie `access_token` automatically attached by browser
- Server verifies HS256 JWT, extracts `userId`, `role`, `divisionId`

## Phase 1 NEW endpoints (this Plan A scope)

```
# Audit logs
GET  /api/audit-logs?action=...&user_id=...&from=...&to=...&page=...
                                          // Owner only
# CSV export
GET  /api/kpis/export.csv?q=...&period=...&format=csv
                                          // Owner or Kepala Kantor
# Calendar
GET  /api/calendar/events?month=...&year=...
                                          // Any role, filtered by user scope
# Approval workflow
POST /api/approvals                       // create approval request
PATCH /api/approvals/[id]                // { status: 'approved' | 'rejected' }
                                          // Per RBAC
# Target cascade
GET  /api/targets/cascade?period=...&parent_id=...
POST /api/targets                        // { parent_target_id, cascade_period, value }

# Employee profile
GET  /api/employees/[id]                 // detailed profile
GET  /api/employees?division_id=...&page=...
                                          // leaderboard
GET  /api/employees/[id]/performance     // score breakdown
                                          // KPI score, Task score, etc.
# Digital Twin
GET  /api/twin/overview                  // all blocks + status
                                          // Owner, Kepala Kantor
```

## Phase 1 Stricter 403

Currently `role-guard` does silent redirect to /personal/tasks.
Change to return 403 + user-friendly error page when:
- User tries forbidden API endpoint
- User tries forbidden page route

Add middleware:
```ts
// On 403 → render `app/error.tsx` with `403 Access denied`
// Instead of redirect
```

---
