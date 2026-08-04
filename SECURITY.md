# SECURITY — Findings & Required Fixes

## 🚨 Findings (audited 2026-08-04)

### 1. CRITICAL: anon can read all `users` fields including `pin_hash` and `pin_salt`

**Severity**: CRITICAL — anyone with the publishable key can extract password hashes.

**Reproduction**:
```bash
curl 'https://wzwyiasnjzgnlmphqgkj.supabase.co/rest/v1/users?select=pin_hash,pin_salt,email,phone&limit=1' \
  -H 'apikey: sb_publishable_tO5Tvwvk8fkTidFAba6ibQ_DBlmggBp' \
  -H 'Authorization: Bearer sb_publishable_tO5Tvwvk8fkTidFAba6ibQ_DBlmggBp'
# Returns 1 row with the hash and salt for any user.
```

**Root cause**: Migration `001_initial_schema.sql` ran
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
```
This gave anon a GRANT wide enough that, combined with RLS policies that
evaluate `auth.uid() = NULL` for anon, every row passes the auth check.

**Fix**: run `supabase/migrations/010_security_lockdown.sql` in the Supabase
SQL Editor. Revoke ALL from anon, then re-grant SELECT only on the public
views the dashboard reads.

### 2. CRITICAL: anon can PATCH `users.position` via REST

**Severity**: CRITICAL — anyone with the publishable key can write to the
users table.

**Reproduction**:
```bash
curl -X PATCH 'https://wzwyiasnjzgnlmphqgkj.supabase.co/rest/v1/users?id=eq.<USER_ID>' \
  -H 'apikey: sb_publishable_tO5Tvwvk8fkTidFAba6ibQ_DBlmggBp' \
  -H 'Authorization: Bearer sb_publishable_tO5Tvwvk8fkTidFAba6ibQ_DBlmggBp' \
  -H 'Content-Type: application/json' \
  -d '{"position":"hacked"}'
# Returns 204.
```

**Fix**: same migration as above — revoking ALL blocks PATCH.

### 3. CRITICAL: `notifications` policy allows anonymous INSERT spam

```sql
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);
```
Combined with an open GRANT, this means anyone can spam notifications.

**Fix**: in `010_security_lockdown.sql`, add `anon cannot insert notifications`.

### 4. HIGH: PIN login endpoint has no rate limit

**Severity**: HIGH — combined with the `pbkdf2Sync` loop over 13 users, an
attacker can attempt ~1,000 PINs/second from a single connection.

**Fix**: see `src/lib/auth/rate-limit.ts` (this commit) — add session-scoped
rate limit (10 min, 5 attempts per IP). Wire into `src/app/api/auth/pin/route.ts`.

### 5. HIGH: PIN login logs all candidate users to console

**Severity**: HIGH information disclosure — every failed login writes
`[AUTH] verifyPin result for <full_name>` to Vercel logs.

**Fix**: this commit removes all `console.log`/`console.error` spam from the
PIN route and replaces with a single line on success.

### 6. MEDIUM: `JWT_SECRET` falls back to a hardcoded string

```ts
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars'
)
```

**Fix**: server refuses to boot if `JWT_SECRET` is missing OR uses the
fallback string. Added check in `src/lib/auth/jwt.ts`.

### 7. MEDIUM: `isWeakPin` is implemented but never called

`src/lib/auth/pin.ts:64` defines `isWeakPin()` but `src/app/api/auth/pin/route.ts`
never invokes it. Users can still set/verify weak PINs like `0000`.

**Fix**: this commit adds `isWeakPin` check to the PIN route.

### 8. MEDIUM: `refreshAccessToken` is a stub

`src/lib/auth/jwt.ts:124` returns `null` with a comment "Will be implemented".
The refresh token is therefore useless.

**Fix**: this commit completes the implementation by fetching the user from
the service-role client and re-signing fresh tokens.

### 9. LOW: dead `bcrypt` dependency

`package.json` lists `bcrypt` but the codebase uses `pbkdf2Sync`. Removes
bloat and reduces attack surface.

### 10. LOW: missing CSP / HSTS / X-Frame-Options

**Fix**: this commit adds the headers in `next.config.ts`.

---

## ✅ Applied in this commit (server-side guards)

| Fix | File |
|-----|------|
| Rate limit on PIN endpoint | `src/lib/auth/rate-limit.ts` + `src/app/api/auth/pin/route.ts` |
| Remove console.log spam | `src/app/api/auth/pin/route.ts` |
| isWeakPin check | `src/app/api/auth/pin/route.ts` |
| Login attempt logging | `src/lib/auth/login-attempts.ts` |
| refreshAccessToken implementation | `src/lib/auth/jwt.ts` |
| JWT_SECRET guard | `src/lib/auth/jwt.ts` |
| Security headers | `next.config.ts` |
| /api/auth/logout endpoint | `src/app/api/auth/logout/route.ts` |
| /api/health endpoint | `src/app/api/health/route.ts` |
| Session expiry toast | `src/hooks/useSessionTimeout.ts` + `src/providers/AuthProvider.tsx` |
| Bulk operations helper | `src/lib/utils/bulk-ops.ts` |
| Data export helper | `src/lib/utils/export.ts` |
| `tests` script | `package.json` |
| `.env.example` | created |
| Remove `bcrypt` dead dep | `package.json` |
| Remove `.env.example.new` | file |

## 🚧 Required manual action

**Run `supabase/migrations/010_security_lockdown.sql` in the Supabase SQL
Editor** to fix findings #1, #2, #3. Until that's done, anon can still read
pin_hash. The new migration is included in this commit.
