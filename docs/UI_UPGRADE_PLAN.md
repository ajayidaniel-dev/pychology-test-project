# APAS UI Upgrade Plan

**Product:** Psychology Test Scoring Platform (APAS — Clinical Overwatch)  
**Date:** 2026-07-06  
**Scope:** End-to-end UI refresh from login through all clinician and patient-facing flows  
**Stack:** Next.js 14 · shadcn/ui (new-york) · Tailwind 4 · Geist · Recharts

---

## Executive summary

The app is functionally complete but visually inconsistent. shadcn/ui and design tokens exist in `app/globals.css`, yet most pages bypass them with hardcoded `slate-*`, `indigo-600`, and inline hex colors (`#0F172A` in the sidebar). There is no shared auth shell, no responsive navigation, minimal loading/empty states, and raw HTML tables instead of reusable data components.

This plan upgrades UI **flow by flow**, starting with foundations, then auth, then the clinician shell, then each feature area, ending with the patient questionnaire. Each phase is independently shippable.

---

## Current user flows (map)

```
/auth/signin ──┬──> /dashboard (home)
/auth/signup ──┘         │
/auth/verify-email       ├──> /patients ──> /patients/[id] ──> /patients/[id]/sessions/[sessionId]
                         ├──> /scales ──> /scales/[id]
                         │              └──> /scales/new (wizard)
                         │
Patient (no login) ──────┴──> /fill/[token] ──> /fill/[token]/complete
```

| Route | Purpose | Key files |
|-------|---------|-----------|
| `/auth/signin` | Clinician login | `app/auth/signin/page.tsx` |
| `/auth/signup` | Registration | `app/auth/signup/page.tsx` |
| `/auth/verify-email` | Email verification | `app/auth/verify-email/page.tsx` |
| `/(dashboard)/*` | Authenticated shell | `app/(dashboard)/layout.tsx`, `components/layout/sidebar.tsx` |
| `/dashboard` | Caseload overview + alerts | `app/(dashboard)/dashboard/page.tsx`, `components/dashboard/*` |
| `/patients` | Patient list | `app/(dashboard)/patients/page.tsx` |
| `/patients/[id]` | Profile, chart, sessions | `app/(dashboard)/patients/[id]/page.tsx` |
| `/patients/.../sessions/[sessionId]` | Score + AI summary | `app/(dashboard)/patients/[id]/sessions/[sessionId]/page.tsx` |
| `/scales` | Library + custom scales | `app/(dashboard)/scales/page.tsx` |
| `/scales/[id]` | Scale detail (read-only) | `app/(dashboard)/scales/[id]/page.tsx` |
| `/scales/new` | 3-step scale builder | `app/(dashboard)/scales/new/page.tsx` |
| `/fill/[token]` | Patient questionnaire | `app/fill/[token]/page.tsx`, `components/questionnaire/questionnaire-form.tsx` |
| `/fill/[token]/complete` | Submission confirmation | `app/fill/[token]/complete/page.tsx` |

---

## Design principles (for all phases)

1. **Use design tokens, not one-off colors** — prefer `bg-background`, `text-foreground`, `bg-primary`, `border-border`, `text-muted-foreground` over `slate-50`, `indigo-600`, etc.
2. **Compose from shadcn/ui** — `Card`, `Table`, `Alert`, `Badge`, `Form`, `Skeleton`, `Sheet`, `Breadcrumb` already exist under `components/ui/`.
3. **Clinical tone** — calm, trustworthy, high readability; severity colors (red/amber/green) reserved for alerts only.
4. **Mobile-first where patients interact** — questionnaire and auth must work on phones; dashboard can be desktop-primary but must not break on tablet.
5. **Accessibility** — WCAG AA contrast, focus rings, `aria-live` for async states, no emoji-only critical warnings.
6. **Minimal scope per PR** — one phase or sub-phase per PR keeps review manageable.

---

## Phase 0 — Design system foundation

**Goal:** Establish shared primitives so every later phase is faster and consistent.

### 0.1 Audit & token alignment

- [ ] Replace hardcoded `bg-slate-50` page backgrounds with `bg-muted/30` or `bg-background`.
- [ ] Replace `bg-indigo-600 hover:bg-indigo-700` button overrides with default `Button` variant (`default` uses `primary`).
- [ ] Update sidebar to use `--sidebar-*` CSS variables instead of `style={{ backgroundColor: '#0F172A' }}`.
- [ ] Define semantic severity tokens in `globals.css` (optional): `--severity-critical`, `--severity-high`, etc., for badges and alert banners.

### 0.2 Shared layout components (new)

Create under `components/layout/`:

| Component | Responsibility |
|-----------|----------------|
| `PageHeader` | Title, description, optional breadcrumb, right-side actions slot |
| `PageShell` | Consistent `max-w-*` and vertical spacing for dashboard pages |
| `AuthLayout` | Split or centered auth shell with logo, tagline, and card slot |
| `EmptyState` | Icon + title + description + CTA for zero-data views |
| `DataTable` | Wrapper around shadcn `Table` with header row styling and empty state |

### 0.3 Wire theme provider (optional but recommended)

- [ ] Add `ThemeProvider` from `components/theme-provider.tsx` to `app/providers.tsx`.
- [ ] Add `ThemeToggle` to sidebar footer (component already exists).
- [ ] Verify dark mode tokens in `globals.css` render correctly on all shared components.

### 0.4 Global loading & error UX

- [ ] Replace `app/loading.tsx` (`return null`) with a centered `Skeleton` or spinner.
- [ ] Add `app/(dashboard)/loading.tsx` with dashboard-appropriate skeleton (stat cards + table rows).
- [ ] Standardize form errors on shadcn `Alert` (`variant="destructive"`) instead of bare `<p className="text-red-500">`.

**Deliverable:** Foundation PR with no user-visible flow changes, or only subtle token consistency.

**Files touched:** `app/globals.css`, `app/providers.tsx`, `app/loading.tsx`, new `components/layout/*`

---

## Phase 1 — Authentication flow

**Goal:** Professional first impression; consistent branding from sign-in through verification.

### 1.1 Auth layout shell

- [ ] Create `app/auth/layout.tsx` wrapping all auth routes in `AuthLayout`.
- [ ] Left panel (desktop): APAS logo/wordmark, “Clinical Overwatch” tagline, brief value prop (1–2 lines).
- [ ] Right panel: form card on `bg-card` with subtle shadow.
- [ ] Mobile: stack vertically; logo above form.

### 1.2 Sign in (`/auth/signin`)

- [ ] Migrate to shadcn `Form` + `FormField` (react-hook-form already in use).
- [ ] Add password visibility toggle.
- [ ] Success state after `?registered=1` → use `Alert` with check icon instead of inline “✓” in description.
- [ ] `EMAIL_NOT_VERIFIED` error → dedicated `Alert` with link to resend (if API exists) or instructions.
- [ ] Loading state on submit button with spinner.
- [ ] Footer link styling via `Button variant="link"`.

### 1.3 Sign up (`/auth/signup`)

- [ ] Same `AuthLayout` and `Form` patterns as sign-in.
- [ ] Password strength hint (min 8 chars — match zod schema).
- [ ] Inline field-level validation messages via `FormMessage`.
- [ ] Post-signup flow: consider redirect to “check your email” screen if email verification is required (currently auto sign-in).

### 1.4 Verify email (`/auth/verify-email`)

- [ ] Build proper states: loading (spinner), success, error/expired.
- [ ] Add client-side token handling if verification is URL-driven (check `app/api/auth/verify-email/route.ts`).
- [ ] Success CTA: “Continue to sign in” button.
- [ ] Match auth visual language.

**Deliverable:** Cohesive auth experience; remove all `bg-slate-50` and `indigo-*` from auth pages.

**Files:** `app/auth/layout.tsx`, `app/auth/signin/page.tsx`, `app/auth/signup/page.tsx`, `app/auth/verify-email/page.tsx`, `components/layout/auth-layout.tsx`

---

## Phase 2 — App shell (sidebar + dashboard layout)

**Goal:** Responsive, token-based navigation that scales to more routes.

### 2.1 Sidebar redesign

- [ ] Use shadcn `Sidebar` component (`components/ui/sidebar.tsx`) or refactor `components/layout/sidebar.tsx` to use sidebar tokens.
- [ ] Active state: `bg-sidebar-accent` + `text-sidebar-accent-foreground` instead of hardcoded indigo.
- [ ] User section: `Avatar` with initials, truncated name/email.
- [ ] Sign out: `DropdownMenu` or ghost button with icon + label.
- [ ] Add `ThemeToggle` in footer.

### 2.2 Responsive behavior

- [ ] Desktop (≥1024px): fixed sidebar, ~240px.
- [ ] Tablet/mobile: collapse to `Sheet` hamburger menu via shadcn `Sheet`.
- [ ] Add top bar on mobile with menu trigger + page title.

### 2.3 Dashboard layout polish

- [ ] Update `app/(dashboard)/layout.tsx`: use `bg-background`, add optional `SidebarProvider` if using shadcn sidebar.
- [ ] Main content: responsive padding (`p-4 md:p-6 lg:p-8`), `min-h-screen`.
- [ ] Optional: sticky `PageHeader` area for context on scroll.

**Deliverable:** Navigation works on mobile; no inline styles; dark mode compatible.

**Files:** `app/(dashboard)/layout.tsx`, `components/layout/sidebar.tsx`, possibly `components/layout/mobile-nav.tsx`

---

## Phase 3 — Dashboard home (`/dashboard`)

**Goal:** At-a-glance clinical command center with scannable alerts and caseload.

### 3.1 Page structure

- [x] Wrap in `PageHeader` (“Dashboard”, welcome message with user name).
- [x] Use `PageShell` for consistent width.

### 3.2 Stat cards (`components/dashboard/stat-cards.tsx`)

- [x] Use shadcn `Card` with `CardHeader` / `CardContent`.
- [x] Separate numeric value from label; avoid cramming “3 (1 Critical)” into one line — use `Badge` for critical count.
- [x] Add subtle hover elevation or border accent on critical/alert cards.
- [x] Optional: click-through links (e.g. “Open Alerts” → filtered view).

### 3.3 Alert feed (`components/dashboard/alert-feed.tsx`)

- [x] Replace flat rows with `Card` list items or compact `Table`.
- [x] Severity: use shared `SeverityBadge` component (critical / high / moderate).
- [x] Suicidal ideation: `Alert variant="destructive"` — no emoji-only warning.
- [x] Empty state: `EmptyState` with reassuring copy (“No patients require immediate attention”).
- [x] Mobile: stack metadata vertically.

### 3.4 Caseload table

- [x] Migrate raw `<table>` to shadcn `Table` via `DataTable` wrapper.
- [x] Row hover, clickable row → patient profile.
- [x] Empty state with CTA to `/patients`.
- [ ] Optional: sort by last score or session count.

**Deliverable:** Dashboard feels like a clinical overview, not a prototype.

**Files:** `app/(dashboard)/dashboard/page.tsx`, `components/dashboard/stat-cards.tsx`, `components/dashboard/alert-feed.tsx`, new `components/ui/severity-badge.tsx`

---

## Phase 4 — Patients flow

### 4.1 Patients list (`/patients`)

- [x] `PageHeader` with patient count + `NewPatientDialog` in actions slot.
- [x] `DataTable` with columns: ID, Name, Sessions, Last Score, Added, actions.
- [x] `Badge` for session count; severity-colored last score if available.
- [x] Row click → profile; explicit “View” as secondary action.
- [x] Empty state with illustration/icon + “Add first patient” CTA.

### 4.2 New patient dialog (`components/patients/new-patient-dialog.tsx`)

- [x] `Form` + `FormDescription` for PII guidance.
- [x] Success toast via `sonner` (already in dependencies) on create.
- [x] Use default `Button` primary variant.

### 4.3 Patient profile (`/patients/[id]`)

- [x] `Breadcrumb`: Patients → {anonymousId}.
- [x] Header: patient ID prominent, display name secondary, `SeverityBadge` if critical.
- [x] Critical banner: shadcn `Alert` full-width, `role="alert"`.
- [x] Score history card: chart in `Card`; add trend label (“Improving / Stable / Worsening”) from chart logic.
- [x] Sessions table → `DataTable` with status `Badge` (PENDING amber, COMPLETED green).
- [x] `CopyLinkButton` → proper `Button variant="ghost" size="sm"` with tooltip.
- [x] `PatientActions`: replace `confirm()` with `AlertDialog` for delete.

**Deliverable:** Patient management feels safe, clear, and actionable.

**Files:** `app/(dashboard)/patients/page.tsx`, `app/(dashboard)/patients/[id]/page.tsx`, `components/patients/*`, `components/sessions/copy-link-button.tsx`

---

## Phase 5 — Session detail & AI summary

### 5.1 Session detail page (`/patients/[id]/sessions/[sessionId]`)

- [x] `Breadcrumb`: Patients → {id} → Session {date or #}.
- [x] Score summary card: large score typography, `SeverityBadge`, grid of item scores (consider compact `Table` or two-column layout).
- [x] Item labels: show question text where possible (fetch scale items) instead of only “Item 1”.
- [x] Back navigation link at top.

### 5.2 Narrative panel (`components/sessions/narrative-panel.tsx`)

- [x] Card with clear “AI-generated” disclaimer in `CardDescription`.
- [x] Loading: `Skeleton` lines instead of spinner-only.
- [x] Error: `Alert` with retry button.
- [x] Narrative text: prose styling (`prose prose-sm dark:prose-invert` or custom `leading-relaxed`).
- [x] Actions: `Mark Reviewed` / `Escalate` — use distinct variants; show toast on success.
- [x] Reviewed/Escalated states: `Badge` persistently visible.

### 5.3 Session chart (`components/sessions/session-chart.tsx`)

- [x] Wrap in `Card`; add chart title and legend for reference lines.
- [x] Use `--chart-*` tokens for line colors where possible.
- [x] Tooltip styling to match theme.
- [x] Empty/single-point data: show message instead of empty chart.

**Deliverable:** Session review is the clinical decision-support moment — make it authoritative and readable.

**Files:** `app/(dashboard)/patients/[id]/sessions/[sessionId]/page.tsx`, `components/sessions/narrative-panel.tsx`, `components/sessions/session-chart.tsx`

---

## Phase 6 — Scales flow

### 6.1 Scales list (`/scales`)

- [x] `PageHeader` + “New Scale” as primary `Button`.
- [x] Section headers with count badges (“Library Scales · 3”).
- [x] `ScaleCard` polish: consistent hover, focus ring for keyboard, library vs custom visual distinction.
- [x] Empty “My Scales” → `EmptyState` with CTA.

### 6.2 Scale detail (`/scales/[id]`)

- [x] `Breadcrumb`: Scales → {name}.
- [x] Library lock indicator as `Badge variant="secondary"`.
- [x] Items list: numbered `Card` rows or `Accordion` for long scales.
- [x] Option chips: use `Badge variant="outline"`.
- [x] Thresholds table → shadcn `Table`.
- [x] Delete: ensure `AlertDialog` from `_delete-button.tsx` matches design system.

### 6.3 New scale wizard (`/scales/new`)

- [x] Replace custom step indicator with shadcn-friendly stepper (or `Tabs` styled as steps).
- [x] Each step in `Card` with clear section titles.
- [ ] Questions step: drag-to-reorder (optional, Phase 6b); at minimum clear add/remove affordances.
- [x] Thresholds step: table-like layout with aligned inputs.
- [x] Sticky footer nav (Back / Next / Create) on mobile.
- [x] Validation feedback before advancing steps.

**Deliverable:** Scale management matches the quality of the rest of the clinician app.

**Files:** `app/(dashboard)/scales/page.tsx`, `app/(dashboard)/scales/[id]/page.tsx`, `app/(dashboard)/scales/new/page.tsx`, `components/scales/scale-card.tsx`

---

## Phase 7 — Patient-facing questionnaire

**Goal:** Low-friction, trustworthy, mobile-optimized — patients often complete on phone.

### 7.1 Fill page shell (`/fill/[token]`)

- [x] Dedicated minimal layout (no clinician sidebar): `app/fill/layout.tsx`.
- [x] Branded header bar: clinician/org neutral (“Secure Questionnaire”).
- [x] Invalid/expired link page: friendly `Card` with icon, clear next steps.

### 7.2 Questionnaire form (`components/questionnaire/questionnaire-form.tsx`)

- [x] **Progress indicator** — “Question 3 of 9” + `Progress` bar at top (sticky on mobile).
- [x] One question per screen on mobile (optional step mode) OR improved long-form with sticky submit.
- [x] Radio options: large tap targets (`min-h-11`), full-width selectable cards instead of tiny radio dots.
- [x] Replace raw `<textarea>` with shadcn `Textarea`.
- [x] Sticky bottom submit bar on mobile with disabled state until complete.
- [x] PHQ-9/GAD-7 intro copy in `Alert` or callout box.
- [x] Autofocus management between questions (step mode).

### 7.3 Complete page (`/fill/[token]/complete`)

- [x] Success icon (Lucide `CheckCircle2`), not unicode “✓”.
- [x] Reassuring copy; optional “What happens next” bullet list.
- [x] Calm color palette; no clinician branding leakage.

**Deliverable:** Patient flow feels like a modern health form, not an internal admin page.

**Files:** `app/fill/layout.tsx`, `app/fill/[token]/page.tsx`, `app/fill/[token]/complete/page.tsx`, `components/questionnaire/questionnaire-form.tsx`

---

## Phase 8 — Polish & QA

### 8.1 Cross-cutting

- [x] Toast notifications (`sonner`) for: patient created, session created, link copied, reviewed/escalated.
- [x] Consistent dialog patterns for all modals (`DialogHeader`, `DialogFooter`).
- [x] Replace all `confirm()` with `AlertDialog`.
- [x] Add `metadata` titles per route for browser tabs.
- [x] Favicon and OG image (clinical, neutral).

### 8.2 Accessibility pass

- [x] Keyboard nav through sidebar and tables.
- [x] `aria-live="polite"` on AI narrative load complete.
- [x] Focus trap in dialogs (shadcn handles most).
- [x] Color contrast check on severity badges (light + dark).

### 8.3 Responsive QA matrix

| Viewport | Flows to test |
|----------|----------------|
| 375px | Auth, questionnaire, patient list |
| 768px | Dashboard, patient profile |
| 1280px+ | Full dashboard, scale wizard |

_Manual sign-off: verify auth sign-in, fill questionnaire step mode, patient list cards at 375px; dashboard and patient profile at 768px; full dashboard, session review, and scale wizard at 1280px._

### 8.4 Performance

- [x] Skeleton loaders on server-heavy pages (dashboard, patient profile).
- [x] Lazy-load `SessionChart` and `NarrativePanel` if needed.

---

## Suggested implementation order

| Sprint | Phases | Rationale |
|--------|--------|-----------|
| 1 | 0 + 1 | Foundation + auth — every user sees this first |
| 2 | 2 + 3 | Shell + dashboard — core daily use |
| 3 | 4 + 5 | Patients + sessions — primary clinical workflow |
| 4 | 6 | Scales — less frequent but complex wizard |
| 5 | 7 + 8 | Patient questionnaire + polish |

---

## New shared components checklist

Components to create once and reuse:

- [x] `components/layout/auth-layout.tsx`
- [x] `components/layout/page-header.tsx`
- [x] `components/layout/page-shell.tsx`
- [x] `components/layout/empty-state.tsx`
- [x] `components/layout/data-table.tsx`
- [x] `components/ui/severity-badge.tsx`
- [x] `components/layout/section-header.tsx`

---

## Out of scope (for this UI pass)

- Backend / API changes
- Email sending infrastructure
- Custom scale editing (post-create)
- Patient portal or account system
- CSV batch import UI
- Admin / multi-tenant reporting

---

## Success criteria

- [x] Zero hardcoded `indigo-600` / `#0F172A` in page components (sidebar uses tokens).
- [x] All authenticated pages use shared `PageHeader` + consistent spacing.
- [x] All data lists use shadcn `Table` or structured card lists.
- [x] Auth + questionnaire usable on 375px width without horizontal scroll.
- [x] Critical clinical alerts use accessible `Alert` components, not emoji-only warnings.
- [x] Dark mode works across all flows (if theme toggle shipped).

---

## Getting started

**Recommended first task:** Phase 0.1 + 0.2 — align tokens and add `PageHeader`, `AuthLayout`, and `EmptyState`. Then Phase 1.1 auth layout, since it’s isolated and high visibility.

```bash
yarn dev
# Visit http://localhost:3000/auth/signin to iterate on auth shell
```

When opening a PR, reference the phase number (e.g. “UI Phase 1: Auth layout and sign-in form”) so progress is easy to track against this document.
