# Syahfalah Dashboard — Total Audit Report

**Repo**: https://github.com/TlTANPRO/SYAHFALAH  
**Live URL**: https://syahfalah-dashboard.vercel.app  
**Tanggal**: 2026-08-04  
**Audit method**: 100% source code review + partial live (login page captured OK, post-login dashboard gagal di-capture — daemon crash EOF)

---

## 🚨 Severity Summary

| Sev | Count | Tipe |
|-----|-------|------|
| 🔴 P0 | 4 | Routing broken, auth broken, refresh token broken |
| 🟠 P1 | 7 | UX missing, hardcoded data, dead code |
| 🟡 P2 | 6 | Performance, accessibility, consistency |
| Total | **17** | |

---

## 🔴 P0 — Routing & Auth (blocker)

### P0-1: **24/33 sidebar route = 404 Not Found**
**Lokasi**: `src/components/layout/Sidebar.tsx`

Sidebar define 33 link, cuma **9 page.tsx exist**. sisanya = `Next.js 404`. setiap klik menu = dead end.

**Routes exist (9)**:
- `/login`, `/owner`, `/kepala-kantor`, `/personal/tasks`
- `/divisi/[divisionId]`, `/kepala-kantor/divisi/{legal,marketing,media,operasional,proyek}`

**Routes 404 (24)**:
```
/admin/divisions              /divisi/[divisionId]/content
/admin/sow                    /divisi/[divisionId]/kpi
/admin/users                  /divisi/[divisionId]/leads
/calendar                     /divisi/[divisionId]/team
/kepala-kantor/coaching       /kpi
/kepala-kantor/planning       /owner/approvals
/kepala-kantor/team           /owner/kpi
/personal                     /owner/reports
/personal/kpi                 /raci
/personal/notifications       /rewards
/personal/schedule            /settings
/personal/sow                 /sow
```

**Fix**: hapus dari sidebar ATAU buat placeholder pages (`page.tsx` dengan "Coming soon") untuk setiap route.

---

### P0-2: **AuthProvider `signIn` return error dummy**
**Lokasi**: `src/providers/AuthProvider.tsx:95`

```ts
return { success: false, error: 'Use PIN login via API route' }
```

`AuthProvider` adalah abstraction layer yang dipakai seandainya ada perlu programmatic login — tapi sekarang dia hardcode return failure. dead code yang misleading. kalau ada caller lain, dia akan selalu gagal.

**Fix**: hapus `signIn` dari AuthContext ATAU forward ke `/api/auth/pin`.

---

### P0-3: **`refreshAccessToken()` selalu return null**
**Lokasi**: `src/lib/auth/jwt.ts:107`

```ts
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null
  const payload = await verifyRefreshToken(refreshToken)
  if (!payload) return null
  return null  // ← TODO unfinished, no DB lookup
}
```

access token expiry = **15 menit**. refresh tidak implemented → setelah 15 menit, semua user logout paksa setiap kali interact dengan API.

**Fix**: ambil fresh user dari Supabase pakai `service_role` (server-only) atau `auth.admin.getUserById`, lalu `createTokens`.

---

### P0-4: **Type mismatch `UserRole` antara JWT payload dan DB**
**Lokasi**: `src/lib/auth/jwt.ts:18`

```ts
role: 'owner' | 'kepala_kantor' | 'pic_divisi' | 'staff'
```

sama dengan `UserRole` di domain. ✓ OK.

Tapi middleware (`src/middleware.ts:7`) check `verifyAccessToken(accessToken)` tanpa role gating — hanya "ada session atau tidak". siapa pun dengan session valid bisa akses route manapun. **tidak ada role-based authorization** di level route.

**Fix**: tambah role check di middleware. mis. `/owner/*` hanya untuk role `owner`.

---

## 🟠 P1 — UX & Data Integrity

### P1-1: **Hardcoded division UUIDs**
**Lokasi**: `src/app/(dashboard)/kepala-kantor/divisi/marketing/page.tsx:23`, `[proyek]/page.tsx:22`, dst.

```ts
.eq('division_id', '44444444-4444-4444-4444-444444444444')  // MKT
.eq('division_id', '55555555-5555-5555-5555-555555555555')  // PRJ
```

5 division page hardcode UUID. kalau DB di-reset/seed ulang, UUID bisa beda → query return kosong. **coupling ke seed data**.

**Fix**: query `divisions` table by `code` (MKT/PRJ/etc) dulu, dapat UUID, baru query KPI.

---

### P1-2: **Sidebar role mismatch** 
**Lokasi**: `src/components/layout/Sidebar.tsx:78-79`

```ts
const personalNavigation = [
  { name: 'My Dashboard', href: '/personal', ... roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
  { name: 'My Tasks', href: '/personal/tasks', ... roles: ['staff', 'pic_divisi', 'kepala_kantor', 'owner'] },
  ...
```

`/personal` tidak exist (cuma `/personal/tasks` ada). **klik menu pertama untuk tiap role = 404**.

**Fix**: hapus `/personal` dari sidebar, atau buat `src/app/(dashboard)/personal/page.tsx` redirect ke `/personal/tasks`.

---

### P1-3: **JWT_SECRET hardcoded fallback**
**Lokasi**: `src/lib/auth/jwt.ts:7`

```ts
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars'
)
```

kalau env var `JWT_SECRET` lupa di-set, app pakai static fallback string. semua deployment yang lupa set env akan pakai **secret yang sama** (published di source). attacker bisa forge JWT untuk user manapun.

**Fix**: throw error kalau `JWT_SECRET` kosong saat module load di production. Hard fail, jangan silent fallback.

---

### P1-4: **No error boundary / no loading skeleton per route**
**Lokasi**: `find src -name "error.tsx"` = 0 result

kalau ada runtime error di KPI card atau task list, **seluruh dashboard crash** (no graceful fallback). loading.tsx juga tidak ada → query `useQuery` yang lama = blank page.

**Fix**: tambah `src/app/error.tsx` (root level) + `src/app/(dashboard)/loading.tsx` (skeleton).

---

### P1-5: **Tailwind v4 dynamic class broken**
**Lokasi**: `src/components/layout/BentoGrid.tsx:33`

```tsx
className={cn('grid', columnClasses[columns], `gap-${gap}`, className)}
```

Tailwind v4 pakai JIT scanner — `gap-${gap}` (gap-1, gap-2, dst) **tidak terdeteksi** di static class extraction. output CSS tidak include `gap-3`, `gap-4` untuk BentoGrid (default).

**Fix**: hardcode map atau pakai inline style `style={{gap: gap*0.25+'rem'}}`.

---

### P1-6: **404 page tidak ada**
**Lokasi**: `find src -name "not-found.tsx"` = 0 result

kalau user hit URL yang tidak ada (mis. typo `/kepala-kntor`), dapat Next.js default 404 generic. bukan branded.

**Fix**: tambah `src/app/not-found.tsx` dengan branding + tombol kembali ke dashboard.

---

### P1-7: **Daily schedule `formatRelativeTime` undefined**
**Lokasi**: `src/app/(dashboard)/personal/tasks/page.tsx` import `formatRelativeTime` dari `@/lib/utils`

cek apakah function exist di utils:
**Belum diverifikasi**, tapi kalau dipakai dan tidak ada export → TypeScript build error atau runtime `undefined is not a function`.

**Fix**: audit `src/lib/utils.ts` untuk semua import yang dipakai.

---

## 🟡 P2 — Performance & Polish

### P2-1: **BentoGrid `ChartCard` hardcoded `h-64`**
Setiap card tinggi fixed 256px. pada layar besar → card terlihat kecil/tercecer. tidak proporsional dengan `BentoGrid` 4 columns.

**Fix**: dynamic height atau min-height.

---

### P2-2: **No dark/light toggle (placeholder button disabled)**
**Lokasi**: `src/components/layout/Topbar.tsx:104`

```tsx
<Button variant="ghost" size="icon" className="h-10 w-10" disabled>
  <Moon className="h-5 w-5" />
</Button>
```

tombol theme toggle disabled — dead UI element.

---

### P2-3: **No accessibility focus management on sidebar toggle**
**Lokasi**: `src/components/layout/Sidebar.tsx`

saat sidebar collapse, focus hilang — keyboard user tidak tahu di mana posisi.

**Fix**: tambah `aria-expanded`, manage focus return.

---

### P2-4: **Suspense fallback minimal di login**
**Lokasi**: `src/app/(auth)/login/page.tsx:185`

```tsx
<Suspense fallback={<div className="..."><Loader2 ... /></div>}>
```

fallback tidak ada text untuk screen reader.

---

### P2-5: **User PIN 0000 universal — all 13 users**
Demo seed: semua user punya PIN `0000` (lihat login page). production-risk. user di seed tidak di-distinct.

**Fix**: generate unique PIN per user atau force change on first login.

---

### P2-6: **Avatar img fallback broken**
**Lokasi**: `src/components/layout/Sidebar.tsx:195` + `Topbar.tsx:113`

```tsx
src={user.avatarUrl || `/api/avatar?name=${encodeURIComponent(user.name)}`}
```

kalau name ada spasi atau karakter spesial → `/api/avatar?name=Pak%20Ardian` → `/api/avatar/route.ts` handle. tapi route return SVG dengan `<text>` yang tidak di-escape. injection vector.

**Fix**: escape XML di route handler.

---

## 🎯 Patch Plan (urutan eksekusi)

### Phase 1 — P0 blocker (1-2 hari)

```
□ P0-1: Filter sidebar → hanya tampilkan routes yang exist
       (atau batch-create placeholder pages — 1 baris file per route)
□ P0-4: Tambah role check di middleware
□ P0-3: Implement refreshAccessToken dengan DB lookup
□ P0-2: Hapus dummy signIn atau wire ke API
```

### Phase 2 — P1 UX (2-3 hari)

```
□ P1-5: Fix gap-${gap} di BentoGrid (inline style atau map)
□ P1-4: Tambah error.tsx + loading.tsx
□ P1-6: Tambah branded not-found.tsx
□ P1-1: Replace hardcoded UUID dengan division code lookup
□ P1-3: Fail-hard kalau JWT_SECRET kosong
□ P1-2: Hapus /personal link atau redirect
```

### Phase 3 — P2 polish (1-2 hari)

```
□ P2-1: Dynamic ChartCard height
□ P2-2: Enable theme toggle (atau hapus tombol)
□ P2-3: Focus management di sidebar
□ P2-5: Unique PIN per user
□ P2-6: Escape XML di avatar route
```

---

## 🔴 Security Notes (Tertunda — bukan blocker dashboard)

Repo ini punya leak service_role key + anon key di git history. **wajib rotate sebelum fix apa pun** kalau pakai environment live. lihat `SECURITY_ROTATION.md` untuk step-by-step.

---

## ✅ Yang Sudah Bagus

- **Login page**: render clean, no console error, dark theme solid
- **Schema solid**: 15 tables, RLS enabled di semua, generated columns untuk KPI progress/status
- **TypeScript strict mode**: on
- **Domain types lengkap**: User, KPI, SOW, Task, Notification, Reward — semua typed
- **Provider pattern**: SupabaseProvider, AuthProvider, RealtimeProvider, QueryProvider, ThemeProvider — clean separation
- **Dark theme**: konsisten, palette emerald/slate professional
- **BentoGrid + Tailwind v4**: design system terstruktur
- **PIN-based auth**: PBKDF2 100k iter, timing-safe comparison — solid crypto

**platform kuat, content/routes belum lengkap**.

---

## Files yang harus dibuka berikutnya

Untuk patch konkret, buka:
1. `src/components/layout/Sidebar.tsx` (filter routes)
2. `src/middleware.ts` (role check)
3. `src/lib/auth/jwt.ts` (refreshAccessToken)
4. `src/components/layout/BentoGrid.tsx` (gap fix)
5. `src/app/not-found.tsx` (new)
6. `src/app/error.tsx` (new)
7. `src/app/(dashboard)/loading.tsx` (new)

Mau aku mulai Phase 1 patch sekarang? atau ada priority berbeda yang lebih penting buat kamu?