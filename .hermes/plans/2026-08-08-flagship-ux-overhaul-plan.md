---
title: Syahfalah Flagship UX Overhaul — Comprehensive Adversarial Plan
date: 2026-08-08
type: adversarial-UX plan
scope: 48 dashboard pages + shared components
strategy: hybrid (per-page milestones × per-feature milestones)
estimated-effort: 20-30 hours across 4-5 sessions
brand-pillars: Blue + Aurum + Verdigris
baseline: 79 → 93/100 (R1+R2+R3)
target: 95+/100 (Lighthouse, a11y, performance)
---

# Flagship UX Overhaul — Adversarial Plan

## 0. Why this plan exists

User feedback (latest):
> "Hero pattern baru dipasang di 4 hub (owner/personal/admin/divisi) — 48 pages total masih banyak yang belum" — `bisakah buatkan aku plan adversarial khusus UX pada dashboard kita? dan juga aku tidak ingin ada data demo, lebih baik ada zero data state.`

User decisions:
- Q1: (a) Simple monogram gradient logo
- Q2: (c) Actionable + educational + illustration empty states
- Q3: (c) Lighthouse 90+ across all categories
- Q4: (b) Mobile-supported (no break desktop)
- Q5: (b+c) Hybrid — per-page milestones × per-feature milestones

## 1. The 5-category adversarial UX audit

The plan attacks the dashboard from 5 angles the user cares about.
Each category has audit + implementation + verification.

### K1 — Information Architecture & Wayfinding
- Sidebar: 48 pages need consistent navigation by role
- Breadcrumbs: 100% coverage (already done)
- Active state in sidebar reflecting current page
- Inter-page navigation: don't lose context
- 404 fallback: render within dashboard chrome, not generic

### K2 — Empty State Quality (zero data, not demo data)
- "Belum ada data" → "Belum ada leads. Tambah leads pertama →"
- Every list page gets a guided empty state:
  - WHAT: section title
  - WHY: explanation of why this matters
  - HOW: action button to create the first item
  - ILLO: a relevant icon (no decorative illustration)
- Loading state ≠ empty state (shimmer skeleton vs explanation)
- Error state: render with retry CTA

### K3 — Multi-Role UX Consistency
- 5 roles: Owner / KK / PIC / Marketing / Konstruksi
- Sidebar items must filter by role
- "Today's priority" widget per role
- Cross-role visibility — who is doing what

### K4 — Microinteractions & Feedback
- Hover state polish
- Click ripple / feedback
- Form submission states (submitting/success/error)
- Toast positioning
- Focus trap in modal
- Page transition animation
- Reduced-motion respect

### K5 — Accessibility & Mobile
- axe-core scoring (target 95+)
- Mobile 360px responsive
- Keyboard navigation
- Screen reader friendly
- Focus visible everywhere
- Color contrast WCAG AA across both themes

## 2. Hybrid strategy

**Per-feature milestones** (one-time, applied to all 48 pages):
1. **Hero pattern** — extract `HeroSection` component, refactor every page that has a header
2. **Empty state library** — `EmptyState` already exists, design variants + graph
3. **Custom logo SVG** — replace brand-mark with proper logo
4. **Mobile responsive audit** — fix 360px breakpoint on all pages

**Per-page milestones** (deep UX for high-traffic pages):
- Owner dashboard (already done)
- Personal hub (already done)
- Admin hub (already done)
- Divisi hub (already done)
- **NEW**: divisi/[divisionId] (most-used page)
- **NEW**: kepala-kantor dashboard
- **NEW**: owner/marketing (5-tab complex)
- **NEW**: owner/purchasing (4-tab complex)
- **NEW**: owner/maintenance (5-tab complex)
- **NEW**: owner/projects (cluster + project detail)
- **NEW**: owner/construction tracker
- **NEW**: personal/tasks (paginated)
- **NEW**: personal/notifications
- **NEW**: personal/schedule
- **NEW**: personal/sow
- **NEW**: personal/kpi

## 3. Phase ordering

### Phase A — Foundations (1 session, 4-6 hours)
**Per-feature milestones** — build once, use everywhere.

- A1. **Custom logo SVG** — monogram + brand gradient + interactive
- A2. **`HeroSection` component** — branded hero with optional eyebrow, title, subtitle, status pills, action
- A3. **`EmptyState` variants** — actionable + educational + illustration, 4 variants per page archetype
- A4. **`PageHeader` component** — consistent header across all pages (not full hero, just page title area)
- A5. **`LoadingSkeleton` component** — shimmer skeleton variants per page archetype
- A6. **`ErrorState` component** — graceful error with retry
- A7. **Mobile breakpoint audit** — fix `flex-col md:flex-row`, table → card stack, sidebar drawer
- A8. **Focus trap for modal/dropdown** — install `focus-trap-react` pattern

### Phase B — Per-page milestones (1-2 sessions, 8-12 hours)
**Per-page milestones** — deep UX for the 15 high-traffic pages.

Priority order (by traffic / role use):
1. divisi/[divisionId] (every PIC uses this daily)
2. kepala-kantor (KK hub)
3. owner/marketing (5 tabs)
4. owner/purchasing (4 tabs)
5. owner/maintenance (5 tabs)
6. owner/projects (cluster + detail)
7. owner/construction (TODO: which page?)
8. personal/tasks (most-used personal page)
9. personal/notifications
10. personal/schedule
11. personal/sow
12. personal/kpi
13. owner/performance
14. owner/twin
15. owner/approvals

Each page gets:
- Hero or PageHeader
- Empty state if list
- Loading state
- Error state
- Mobile responsive
- Audit fixes

### Phase C — Polish & verification (1 session, 4-6 hours)
**Per-feature milestones** — final polish.

- C1. **Run axe-core** on all 48 pages
- C2. **Run Lighthouse** on top 10 pages
- C3. **Microinteractions** — hover/click/focus polish
- C4. **Cross-role sidebar** — filter by role
- C5. **402 forbidden state** — render within dashboard chrome
- C6. **404 state** — render within dashboard chrome
- C7. **Page transition animation** — Enter/Leave fade
- C8. **Final ship report** — before/after scores

## 4. Detailed task breakdown

### A1 — Custom logo SVG
- Design: monogram "S" with aurum gradient overlay + brand square
- Save: `public/logo.svg` + `public/icons/icon-192.svg` + `public/icons/icon-512.svg`
- Use: `Topbar`, `Sidebar`, `manifest.json`, manifest theme color
- Verify: appears in favicon, sidebar, PWA install

### A2 — HeroSection component
- Props: `eyebrow`, `title`, `subtitle`, `pills`, `action`, `variant?`
- Variants: `default`, `compact`, `aurum` (premium accent)
- Used on: owner (already), personal (already), admin (already), divisi (already)
- Will be used on: 5 more pages

### A3 — EmptyState variants
- 4 variants: `no-data`, `error`, `search-empty`, `filter-no-match`
- Each has: icon, title, description, optional CTA, optional link
- Compact vs full width variants
- Anti-Tell #7: don't use icon topper (icon on the left, not above)

### A4 — PageHeader component
- For pages that don't need full hero
- Props: `title`, `subtitle`, `breadcrumbs`, `actions` (right-aligned)
- Used on: 30+ pages

### A5 — LoadingSkeleton component
- Per archetype: `kpi-grid`, `table`, `card-grid`, `list`, `detail`
- Shimmer animation already in globals.css
- Used on: `loading.tsx` for each route

### A6 — ErrorState component
- Icon + title + description + retry CTA
- Used on: `error.tsx` for each route

### A7 — Mobile breakpoint audit
- Audit every page at 360px, 768px, 1024px
- Common fixes:
  - Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
  - Flex: `flex-col sm:flex-row`
  - Table: `overflow-x-auto` scrollable
  - Sidebar: drawer on mobile
- Add `useBreakpoint` hook if needed

### A8 — Focus trap
- Modal: install focus-trap-react OR custom logic
- Dropdown: Tab/Shift+Tab/Escape handling
- Topbar command palette: focus trap
- Sidebar mobile drawer: focus trap

### Phase B — Per-page milestones
12 high-traffic pages × ~30-60 min each = 8-12 hours

Each page UX checklist:
- [ ] Hero or PageHeader with eyebrow + title + subtitle
- [ ] Status pills where appropriate (Live · realtime, etc.)
- [ ] Empty state if list
- [ ] Loading state via loading.tsx
- [ ] Error state via error.tsx
- [ ] Mobile responsive (test 360px)
- [ ] Keyboard navigation works
- [ ] Focus visible on all interactive

### Phase C — Verification
- axe-core via Playwright (add to devDependencies)
- Lighthouse via Playwright or chrome-cli
- Visual screenshot comparison before/after
- Score 1-100 per page

## 5. Implementation order

I'll execute this in order. Each phase has commits + verification:

1. **Phase A.1-A.4** (foundation) — commit per item
2. **Phase A.5-A.8** (components) — commit per item
3. **Phase B.1-B.15** (per-page) — each page = 1 commit
4. **Phase C.1-C.8** (verification) — periodic commits

Total commits: ~30-40

## 6. Success metrics

| Metric | Before | After | Target |
|---|---|---|---|
| Lighthouse Performance | TBD | 90+ | 90+ |
| Lighthouse A11y | TBD | 95+ | 95+ |
| Lighthouse Best Practices | TBD | 90+ | 90+ |
| Lighthouse SEO | TBD | 90+ | 90+ |
| hero pattern coverage | 4/48 | 48/48 | 48/48 |
| Empty state coverage | 60% | 100% | 100% |
| Mobile responsive | 60% | 100% | 100% |
| axe-core violations | TBD | 0 critical | 0 critical |
| Microinteractions | 60% | 100% | 100% |

## 7. Non-goals (out of scope)

- ❌ No new data sources (using existing tables)
- ❌ No new API routes
- ❌ No new DB tables (or only if needed)
- ❌ No changes to auth/permissions
- ❌ No git push to origin

## 8. Risk mitigation

- **Don't break existing flows**: every commit typechecks + lint + builds
- **Don't break existing data**: zero data state, not delete data
- **Don't break multi-role**: keep existing role checks
- **Visual diff**: capture before/after screenshots

## 9. Communication

Each commit gets a clear message:
- `feat(hero): PageHeader component`
- `feat(empty): EmptyState variants`
- `feat(mobile): 360px responsive audit`
- `feat(focus): focus-trap for modal`
- `feat(pages/divisi): divisi/[id] UX overhaul`
- `feat(lighthouse): 90+ across categories`

## 10. Time budget

- Phase A: 4-6 hours
- Phase B: 8-12 hours (15 pages × 30-60 min)
- Phase C: 4-6 hours
- **Total: 16-24 hours**

Distributed:
- Session 1: Phase A (4-6 hours)
- Session 2: Phase B top 5 pages (4-6 hours)
- Session 3: Phase B remaining 10 pages + Phase C early (4-6 hours)
- Session 4: Phase C final verification (4-6 hours)

## 11. After approval

I will start with **Phase A.1-A.4** (foundation components) — this is the cheapest part with the highest leverage.

If you say "approved", I'll begin immediately.
If you want to adjust scope, I'll revise the plan.
