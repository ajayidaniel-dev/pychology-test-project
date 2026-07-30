# APAS UI Redesign — Plan

**Status:** proposed, awaiting approval. No implementation started.
**Date:** 2026-07-29
**Branch:** `feature/ui-improvement`

---

## 1. Brief

The owner's complaints, as relayed:

1. The UI doesn't feel **medical** — it reads as a generic admin tool.
2. The **tables** specifically are wrong.
3. Reference material: a Pinterest board (light-mode pins) plus six dark-mode
   screenshots of a settings/integrations surface.
4. Redesign is **whole-product**, sequenced starting from auth.
5. Add **micro-interactions**.

Confirmed with the requester:

- **Theme:** keep `system` as the default and keep **both** light and dark as
  first-class. Neither mode is being dropped, and the app is not going
  dark-first. The references span both modes precisely because the issue is not
  the palette.
- **"Medical feel" means clinical precision** — thresholds, cutoffs, exact
  scores, aligned figures, severity legible at a glance. Not a softer
  wellness-portal register. This matches PRODUCT.md's stated personality
  ("density is a feature") and its anti-reference against consumer wellness apps.
- **Tables** become a clinical data grid built once into the shared
  `TanStackDataTable`, inherited everywhere — not replaced by cards.
- **Structure is in scope**, not only theme and colour.

Reference material now consists of **twelve** images: six dark-mode
settings/integrations screenshots and six light-mode pins supplied from the
Pinterest board (the board itself is login-walled and could not be read
programmatically).

### 1.1 What the references agree on

The two sets are in different themes and different product categories, which
makes their overlap the signal worth acting on. Both converge on **structure**:

| Pattern | Seen in |
|---|---|
| Sidebar with **labelled groups** | Dark set (Account / General / Billing), Notes pin (MAIN / ORDER / SETTINGS), Oculis pin (General / Preferences / Settings) |
| Sidebar **search with ⌘K affordance** | Oculis pin |
| Nav **count badges** and status tags on items | Oculis pin (orange `2`, `Beta`) |
| **Tabs / segmented controls as primary in-page IA** | Dark set (All / Analytics / Browser tools), CRM pin (Table / Kanban / List view), Oculis pin (Suggested / Active / Inactive), Synergy pin |
| **Toolbar row**: search + filter-with-count + sort + view switcher | CRM pin, Notes pin, Oculis pin |
| Title with a **muted count beside it** | CRM pin (`People 2,942`) |
| **Value against its denominator** | Oculis pin (`Prompts · 5 / 25 Prompts`) |
| Table header with **no grey band** — plain surface, muted labels, sort chevrons, column rules | CRM pin, Oculis pin |
| **Status pill** in a table cell carrying state | CRM pin (Weak / Good / Strong), dark set (Connected) |
| **Discrete segment meter** for magnitude in a cell | Oculis pin (5-segment volume bar) |
| Record header: identity + status pill + meta + overflow menu | Members pin, dark set |
| **Recessed inset panel** with labelled data columns | Members pin (Age / Sex / Location / Status) |
| Breadcrumb with back-affordance | Notes pin, dark set |

Three of these directly confirm decisions this plan had already reached from the
dark set alone (grouped nav, tabbed IA, unbanded table header). Two are
**better than what was originally proposed** and are adopted in their place:

- **`5 / 25` denominator** (Oculis) independently arrives at the `14/27 ·
  cutoff 15` treatment specified in Phase 3. Confirmed, not speculative.
- **The segment meter** (Oculis) replaces the originally-proposed severity
  "rail" as the row-level risk indicator. It is better: it encodes magnitude
  discretely, reads at a glance in a narrow column, and remains legible to
  colour-blind users because the *number of filled segments* carries the signal
  independently of hue. The rail relied on colour alone.

### 1.2 What the references are explicitly rejected on

- **Per-category pastel card tinting** (Notes pin: pink Psychology, blue
  Groceries, green Autumn) and **multi-coloured decorative tag pills** (Members
  pin). These are decorative colour-coding. In APAS a coloured pill must mean
  patient risk — the Severity Monopoly Rule. Adopting this would make severity
  unreadable as signal.
- **Emoji in data and headings** (Notes pin, Synergy pin). PRODUCT.md's
  anti-reference against consumer wellness apps is explicit: patient risk data
  is never cute.
- **Avatar-heavy, social presentation** (Synergy pin's Employee Spotlight,
  hearts, comments). APAS patients are pseudonymous by design.
- **The airy spacing of all six pins.** These are settings pages and CRMs with
  a dozen rows. APAS is a dense clinical caseload — see Decision 4.

---

## 2. Diagnosis

### 2.1 Verified defects (measured, not asserted)

Contrast computed from the actual token values in `app/globals.css`, converting
OKLCH → sRGB → WCAG 2.1 relative luminance.

#### The severity badge fails AA in every light-mode variant

`components/ui/severity-badge.tsx` renders `text-xs` (12px, weight 500 — small
text, so the 4.5:1 threshold applies) in the full severity colour on a 15% tint
of that same colour. Measured text-on-tint contrast:

| Mode | Critical | High | Moderate | Low |
|---|---|---|---|---|
| **Light** | 3.64 ✗ | 2.62 ✗ | 2.02 ✗ | 2.63 ✗ |
| **Dark** | 3.99 ✗ | 6.50 ✓ | 8.03 ✓ | 6.64 ✓ |

Five of eight fail. This is the product's signature component, it is the only
carrier of patient-risk signal, and PRODUCT.md principle 5 states
"Accessibility is clinical safety — a missed alert is a patient-safety failure."
**This is the single most important fix in the redesign** and it is a
correctness issue, not a taste issue.

Root cause: tinting a colour by 15% and then using the *same* colour as text on
top cannot produce sufficient contrast at any hue. The pattern is structurally
broken; it needs a separate, darker (light mode) / lighter (dark mode) ink token
per severity level rather than reusing the fill colour.

#### Dark mode has no visible surfaces

| Pair | Contrast | Needed |
|---|---|---|
| `--card` `oklch(0.12 0.02 240)` vs `--background` `oklch(0.08 0.02 240)` | **1.02** | ~1.2+ to read as a step |
| `--border` `oklch(0.18 0.02 240)` vs `--background` | **1.11** | 3:1 for meaningful UI boundaries |

Cards are effectively invisible against the page in dark mode, and the hairline
borders that DESIGN.md's Border-First Rule relies on to carry *all* structure do
not render as edges. This is the concrete, measurable reason dark mode looks
flat next to the reference screenshots — in those, card edges and surface steps
are clearly legible. It is not that the references are "darker"; it's that their
surface separation actually resolves.

#### Auth panel uses a colour that fails on its own background

`components/layout/auth-layout.tsx:126` renders the ledger `datum` values in
`text-primary` on `bg-auth-panel`. Light-mode `--primary` `oklch(0.45 0.15 240)`
on `--auth-panel` `oklch(0.16 0.035 255)` measures **2.77:1** — fails. The
logomark tile at line 91 has the same problem. The auth panel is a fixed dark
surface in both themes, so it needs its own on-panel accent token; it cannot
borrow `--primary`, which is tuned for light backgrounds.

#### Everything else measured clean

Body text, muted text, and primary action colours all pass in both modes
(light muted-on-bg 4.57, dark muted-on-bg 6.45, dark foreground 17.98). The
neutral ramp is sound. The failures are concentrated in exactly the places that
carry clinical meaning.

### 2.2 Structural findings

These are the "not just theme and colours" issues.

**S1 — Every page is one scrolling column of full-width cards.**
`app/(dashboard)/patients/[id]/page.tsx` stacks six sections vertically:
profile header → ideation alert → AI summary → score chart → details → sessions
→ direct sends → notes. `PageShell` (`components/layout/page-shell.tsx`) is
literally `max-w-7xl space-y-6` and is the only composition primitive in the
codebase. There is no primary/secondary split, no sticky context, no
navigation *within* a record. A clinician looking for last month's GAD-7 score
scrolls past an AI summary to find it. The reference screenshots navigate
content (persistent rail + tabbed content region); APAS scrolls it.

**S2 — Sidebar is five flat items with no grouping.**
`components/layout/app-sidebar.tsx:23-29`. The references group navigation under
labelled headings (Account / General / Billing). More importantly, **Settings is
currently a peer of Patients** — an account-level destination sitting in the same
list as clinical workspaces. That's an IA error independent of styling.

**S3 — Tabs exist in the design system and are used on exactly one page.**
`components/ui/tabs.tsx` is only consumed by `components/settings/settings-tabs.tsx`.
The patient record — the densest surface in the product — has no tabbed IA at
all. Tabs are the primary structural device in every reference screenshot.

**S4 — One container for every page type.**
`PageShell` applies `max-w-7xl` uniformly, and `DashboardShell` applies
`p-4 md:p-6 lg:p-8` uniformly. Index pages (wide tables that benefit from
120ch+) and detail pages (mixed prose, forms, charts) have genuinely different
measure requirements and currently get the same one.

**S5 — The table is a generic admin grid.**
`components/data-table/data-table.tsx` + `components/ui/table.tsx`. Specifics:

- Header is a grey band (`bg-muted/50`, `h-11`) — spreadsheet, not instrument.
- Severity appears only as a badge *inside* the Score cell
  (`caseload-table.tsx:81-84`). Scanning 30 rows means reading 30 badges; the
  shape of the caseload is not visible at a glance.
- Figures are left-aligned. Score is mono ✓ but sits next to a variable-width
  badge, so digits don't stack into a readable column. Same for Δ.
- **No threshold context.** A PHQ-9 of 14 is meaningless without "of 27, cutoff
  15". The table shows a bare integer — the one thing PRODUCT.md says the
  product exists to make exact.
- Rows are uniform: a critical row and an all-clear row have identical visual
  weight until read.
- No sticky header and no column rules; past ~15 rows you lose your column.

**S6 — The auth branding panel is decorative, not informational.**
`auth-layout.tsx:39-86` is a hand-drawn SVG of a fictional score trend. It
depicts nothing real. The reference screenshots treat the secondary panel as a
genuine product surface.

**S7 — The patient-facing fill flow speaks a different language.**
`components/questionnaire/fill-shell.tsx:11` uses
`bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80` —
glassmorphism, which DESIGN.md explicitly bans ("Don't use gradients, gradient
text, or glassmorphism anywhere"). It also runs `max-w-lg` against the app's
`max-w-7xl`. It reads as a different product.

**S8 — `cmdk` is installed and unused.**
No command palette exists despite the dependency being present and the product
being a keyboard-driven professional tool.

---

## 3. Decisions locked before implementation

1. **Both themes stay. `defaultTheme="system"` is unchanged.** Every phase is
   verified in light *and* dark before it is considered done.
2. **Register is product, not brand.** Earned familiarity. Standard shadcn/Radix
   affordances. No invented controls. The tool disappears into the task.
3. **The Severity Monopoly Rule holds.** Severity colours signal patient risk
   and nothing else.
4. **Density is the goal, not whitespace.** Where the reference screenshots are
   airy, APAS deliberately diverges — those are settings pages with six items;
   this is a clinical caseload. Structure and IA are what we borrow, not
   spacing.
5. **No decorative motion.** Micro-interactions convey state, feedback, or
   continuity. 150–250ms. Every one ships with a `prefers-reduced-motion`
   alternative.
6. **Nothing renders blank without JS or with motion disabled.** Reveals
   enhance an already-visible default.

---

## 4. Phases

Each phase is independently shippable and independently reviewable.

### Phase 0 — Token & motion foundation

*No visual feature work. This is the layer every later phase depends on.*

**Scope**
- Add per-severity **ink** tokens (`--severity-*-ink`) tuned separately for
  light and dark, so badge text hits ≥4.5:1 over its own tint. Rework
  `severity-badge.tsx` to use them.
- Widen the dark surface ramp and lift the background off near-black.

  > **Correction.** §2.1 originally reported dark `card` vs `background` at
  > 1.02:1 and set a target of ≥1.2:1. That used the wrong instrument: the WCAG
  > ratio's `+0.05` term dominates near black, so *every* near-black pair scores
  > ≈1.0 however separated it appears, and no dark ramp can reach 1.2. Surface
  > separation is judged by **OKLCH lightness delta**, which is perceptually
  > uniform. Measured that way the old ramp was thin rather than broken
  > (ΔL 0.040 card / 0.100 border). Target: ΔL ≥0.045 card, ≥0.14 border.
  > The severity-badge and auth-panel findings are unaffected — those are text
  > contrast, where the ratio is the correct instrument.
- Add on-panel accent tokens for the auth surface
  (`--auth-panel-accent`, `--auth-panel-border`) so the fixed-dark panel stops
  borrowing `--primary`.
- Add a motion vocabulary: `--ease-out-quart`, `--ease-out-expo`,
  `--duration-fast|base|slow`, plus a global reduced-motion block.
- Add a semantic z-index scale (dropdown → sticky → modal-backdrop → modal →
  toast → tooltip) replacing ad-hoc `z-10`/`z-20`.

**Files:** `app/globals.css`, `components/ui/severity-badge.tsx`,
`components/layout/auth-layout.tsx`, new `scripts/check-contrast.mjs`

**Acceptance:** `yarn check:contrast` passes — it parses the real `globals.css`
and gates every clinically-meaningful text pairing in both themes, exiting
non-zero on any AA failure. Production build clean. No visual regression on any
existing page.

**Status: complete.** 27/27 pairings pass. The gate also caught two severity
inks that were outside the sRGB gamut (browsers would have silently clipped
them) and a dark `destructive` fill at 3.83:1 — neither was visible by
inspection, which is the argument for keeping the script in CI.

---

### Phase 1 — Auth (5 screens)

**Scope**
- Rebuild `AuthLayout`: the branding panel becomes an informational surface
  rather than a fictional SVG chart (S6), and uses the new on-panel tokens.
- Rebuild the five forms with complete state coverage and micro-interactions:
  label/field focus transition, password-strength as a live meter, submit
  pending state, error entrance that reserves its own space instead of jumping
  the layout, success → redirect continuity.
- Verify the panel and forms in light and dark, at mobile / tablet / desktop.

**Files:** `components/layout/auth-layout.tsx`,
`components/auth/{auth-card,reveal-region,sign-in-form,sign-up-form,forgot-password-form,reset-password-form,password-strength}.tsx`,
`app/auth/verify-email/page.tsx`, `components/ui/{button,input}.tsx`,
`lib/validation/signup.ts`, `app/globals.css`

**Acceptance:** every screen has default / focus / hover / pending / error /
success states; keyboard-complete; no layout shift on error; both themes.

**Status: complete.** Build passes, 73/73 tests pass, contrast gate passes, all
five routes return 200 and render server-side.

Notable decisions taken during the build:

- **Superseded — the two-panel split is gone.** Phase 1 first replaced the
  panel's fictional SVG trend with a real instrument-reference table (PHQ-9 /
  GAD-7 / BDI-II with true item counts, ranges, and published cutoffs). On
  review the owner asked for a **centred card** instead, and the whole panel was
  removed: it had been giving a marketing surface half the viewport on a screen
  whose only job is one short form. The layout now has a single composition at
  every breakpoint rather than a mobile/desktop fork — brand above the card,
  legal and the clinical-judgment disclaimer below, nothing in the card but the
  task. The `--auth-panel-*` tokens were deleted along with it (nothing else
  referenced them) and their rows dropped from the contrast gate, which now
  covers 24 pairings.
- **The password strength meter lost its red/amber/green ramp.** It now runs a
  single-hue intensity scale. A traffic-light meter teaches the severity
  vocabulary — the exact colours that mean patient risk elsewhere — on a
  password field, which weakens the one signal that must stay unambiguous.
  Strength is carried by bar width, label, and the requirement checklist.
- **`AuthCard` + `RevealRegion` were extracted** so all five screens share one
  banner behaviour, title scale, and footer position, and so an error animates
  the region open instead of shoving the form down the page.
- **`transition-all` was scoped on Button.** It had been animating width, so
  every pending-state label swap visibly stretched the button.
- Two latent bugs fixed: signup had no `catch`, so a dropped connection left the
  button spinning with no explanation; reset-password with no token rendered a
  form-with-an-error rather than a dead end with a recovery action.

---

### Phase 2 — App shell & navigation

**Scope**
- Group sidebar navigation under labelled headings; move Settings out of the
  clinical peer list (S2). Support **count badges** on nav items (open alerts,
  pending questionnaires) per the Oculis pin.
- Add a **search entry point at the top of the sidebar with a ⌘K affordance**
  (Oculis pin), wired to the command palette below.
- Rework `DashboardHeader` — breadcrumb with back-affordance, page title with
  **muted count** (`Patients 128`, per the CRM pin), actions, theme toggle.
- Introduce a **command palette** on the existing `cmdk` dependency (S8):
  jump to patient, scale, batch; core actions.
- Split `PageShell` into index vs detail variants with appropriate measures (S4).
- Micro-interactions: active-route transition, sidebar collapse, palette
  open/close, header shadow on scroll.

**Files:** `components/layout/{app-sidebar,dashboard-header,dashboard-shell,page-shell,page-header}.tsx`,
new `components/layout/command-palette.tsx`, new `lib/navigation.ts`,
new `app/api/navigation/search/route.ts`, `app/(dashboard)/layout.tsx`

**Acceptance:** navigation IA is grouped and correct; palette is keyboard-first
(⌘K) and fully accessible; collapse and mobile sheet both work; both themes.

**Status: complete.** Build compiles, 73/73 tests pass, contrast gate passes,
`tsc` clean across all new files, protected routes 307 when signed out, the
search API returns 401 unauthenticated, and all four new Prisma queries were
executed against the dev database rather than assumed.

Decisions taken during the build:

- **Nav groups are Clinical / Library / Account.** Settings had been a flat peer
  of Patients, which read as though configuring your account were a clinical
  destination.
- **The critical-alerts badge was deliberately not built.** The dashboard
  derives severity via `computeAlerts`, which can escalate above the stored
  `response.severity` on suicidal-ideation endorsement. Counting the stored
  column in the sidebar would have been cheap but could disagree with the
  dashboard, and two different "critical" counts on one screen is worse than
  none. The badge ships as `pendingQuestionnaires`, which matches the
  StatusBand's own definition exactly. Revisit once Phase 4 centralises alert
  derivation.
- **The palette index loads on first open**, not into every page render, and is
  scoped to the signed-in clinician — a palette that could surface another
  practice's patient identifiers would be a data-isolation failure. Patient
  entries lead with the pseudonymous id; a display name is only a secondary hint.
- **No second breadcrumb crumb on detail routes.** The header is a client
  component with no record data, so any second crumb could only be a
  placeholder, and a breadcrumb reading "Detail" is worse than a plain "Back to
  Patients" link. The record is named by the page's own `PageHeader`.
- **`PageShell` gained index (`100rem`) and detail (`6xl`) widths**, resolved
  from the route in `DashboardShell`, so pages did not each need editing.

---

### Phase 3 — The clinical data grid

*The owner's headline complaint. Built once, inherited by every table.*

**Scope** — addresses each S5 item:
- **Severity segment meter** (adopted from the Oculis pin, replacing the
  originally-proposed colour rail): a 4-segment indicator where the number of
  filled segments encodes severity none → critical. Magnitude reads at a glance
  in a narrow column and survives colour-blindness, because the count carries
  the signal independently of the hue.
- **Right-aligned mono figures** with `tabular-nums`, so digits stack into a
  scannable column.
- **Threshold context**: score rendered against its maximum and cutoff
  (`14/27 · cutoff 15`) rather than as a bare integer — the `5 / 25` pattern
  from the Oculis pin.
- **Header restyled from grey band to plain surface** with muted labels, sort
  chevrons, and vertical column rules (CRM and Oculis pins); **sticky** at scroll.
- **Row weighting** so critical rows carry more visual weight than resolved ones.
- **Toolbar**: search + filter-with-active-count + sort, per the CRM pin.
- Micro-interactions: sort transition, row hover/focus, selection feedback,
  pagination.
- Skeleton loading states replacing any spinners.

Applied at the shared layer, so `caseload-table`, `patient-list-table`,
`patient-sessions-table`, `patient-direct-sends-table`, `scales-table`,
`scale-thresholds-table`, `session-questionnaires-table`, `item-scores-table`,
`batch-list-table`, and `batch-sessions-table` all inherit it.

**Files:** `components/ui/table.tsx`,
`components/data-table/{data-table,data-table-column-header,data-table-pagination,data-table-toolbar}.tsx`,
`components/dashboard/caseload-table.tsx`, then the nine other table consumers.

**Acceptance:** every table in the app reads as one system; severity legible
without reading text; figures align; sticky header holds at 50+ rows; mobile
rows still work via `renderMobileRow`; both themes.

**Status: complete for the shared layer, caseload, and patient list.** Build
passes, 73/73 tests pass, `tsc` clean on all touched files, contrast gate now
covers 32 pairings.

- **Risk 3 resolved favourably.** `lib/alert-rules.ts` already held `maxScore`
  and per-band thresholds for PHQ-9 / GAD-7 / BDI-II, plus `getScaleMeta` and
  `getThresholdCrossed`. No schema work was needed. Custom scales return null
  and the readout degrades to the bare figure rather than inventing a
  denominator.
- **The meter draws in ink, not fill.** Fill tones are tuned to sit under
  15%-opacity badge backgrounds; measured against a light card several land near
  2:1 — `severity-moderate` at 2.27:1. Fine behind text, far too weak for a 4px
  bar that must be seen on its own. Ink clears the 3:1 WCAG 1.4.11 asks of
  non-text marks (light-mode meters now measure 5.6–6.7:1), and the gate
  enforces it so a future token tweak can't silently break the mark.
- **Severity became its own column** rather than a badge inside Score, so
  scanning a caseload is one vertical sweep instead of thirty separate reads.
- **Row weight for critical rows is ink weight, not a colour wash** — tinting a
  whole row would spend the severity palette on a surface.
- Fixed a pre-existing type error in `shapePatientListItem` (nullable
  `response.severity` passed to a `string | undefined` parameter).

**Deferred deliberately:** the toolbar's filter-with-active-count. The tables
have no defined filter model beyond the batches domain's existing
`batch-filters.ts`, and a generic filter UI with invented semantics is
speculative work. It lands per-table in Phase 6 where each table's filters are
actually specified.

**Remaining consumers** (`patient-sessions-table`, `scales-table`,
`session-questionnaires-table`, `item-scores-table`, `batch-*-table`,
`scale-thresholds-table`, `patient-direct-sends-table`) inherit the header,
column rules, sticky behaviour, and alignment automatically from the shared
layer. They are swept for score/severity-specific treatment in Phases 5-6.

---

### Phase 4 — Dashboard

**Scope** — `StatusBand`, `AlertFeed`, `CaseloadSection`. The dashboard must
answer PRODUCT.md's stated test: *"who needs my attention right now?" in under
ten seconds.* Restructure so severity ordering and alert prominence carry that,
and ensure `StatusBand` is not a hero-metric template (an explicit ban).
Empty and first-run states that teach the interface.

**Files:** `components/dashboard/{status-band,alert-feed}.tsx`,
`app/(dashboard)/dashboard/page.tsx`, new `lib/alerts.ts`,
new `__tests__/lib/alerts.test.ts`, `lib/navigation.ts`,
`components/layout/app-sidebar.tsx`, `scripts/check-contrast.mjs`

**Status: complete.** Clean build passes, 83/83 tests (10 new), contrast gate at
34 pairings, `tsc` clean on touched files, the new query executed against the
dev database.

- **Alert derivation is centralised** in `lib/alerts.ts`. The dashboard and the
  sidebar badge now share one definition of "critical", which clears the Phase 2
  deferral — the badge ships.
- **`StatusBand` is a band, not three cards.** It was three identically-shaped
  cards with icon, label, oversized figure, and footnote: the hero-metric grid,
  an explicit ban, and three surfaces implying three peers when a clinician
  reads only one of them first. Now one bordered surface with divided segments,
  a third of the vertical space, no longer competing with the alert queue below
  it. Figures moved from `text-3xl` (off the DESIGN.md ramp) to `text-2xl`.
- **First-run state replaces the whole dashboard** when there are no patients. A
  band of zeroes and an empty queue teach a new clinician nothing.
- **`AlertFeed` adopts `ScoreReadout`**, so a score reads identically in the
  queue and the caseload grid.

### Correction to the Phase 2 rationale

Phase 2 deferred the critical badge on the grounds that `computeAlerts`
"escalates above the stored severity on suicidal-ideation endorsement." **That
is not what it does** — verified by reading it and by a failing test written
against the assumption. It reports `suicidalIdeation` as a *separate boolean*
and never raises `severity`.

The deferral's conclusion still held, for a different reason: for known
instruments `computeAlerts` recomputes severity from published thresholds and
only falls back to the stored column for unknown scales, normalising its labels
on the way ("severe" → critical, "mild" → moderate). Reading the column directly
would still have produced a number that disagreed with the dashboard.

### RESOLVED — ideation is an independent alert condition

Owner decision: ideation raises an alert **in parallel with** severity and does
not modify the severity value, so the band stays tied to the score and the trend
chart, delta column, and score history keep their meaning. Implemented in
`deriveAlertCounts` and `AlertFeed`; sub-threshold ideation cases render a
distinct "Safety flag" mark rather than a misleading band. Also added
`hasCurrentIdeation`, because the patient page's safety banner was keyed to the
single newest questionnaire — submitting any other instrument after a PHQ-9
silently hid the flag.

### Findings from the first visual pass — three need owner decisions

Signing in and screenshotting every surface (`scripts/visual-check.mjs`)
surfaced three data-level issues that no amount of UI work fixes.

1. **BDI-II item 9 is not recognised as a suicide item.** `computeAlerts` only
   checks ideation when `scale === 'PHQ9'`. On the BDI-II, item 9 *is* the
   suicidal-thoughts item. Patient P-004 in the dev database has a BDI-II with
   `item9 = 2` — endorsed suicidal thoughts — and the app raises no safety flag
   anywhere, because the check never runs for that instrument. AUDIT item 9 is
   an injury question and PCL-5 has no suicide item, so the mapping is
   per-instrument, not positional. **This is the most serious finding of the
   redesign.** Not changed unilaterally: which instruments carry a suicide item
   is a clinical mapping decision.

2. **The caseload shows the newest assessment's severity, not the patient's
   highest current risk.** P-003's newest result is a PHQ-9 of 7 (mild), so the
   caseload renders a moderate meter — while a current PCL-5 of 51 (severe) sits
   in the alert queue on the same screen. For a triage surface whose stated job
   is "who needs my attention right now", showing the most recent rather than
   the most concerning result understates risk. Fixing it means deciding whether
   a caseload row represents the latest assessment or the worst current one.

3. **An AI patient summary describes assessments that do not exist.** P-004 has
   exactly one completed response (BDI-II, 2026-07-20). Its stored summary,
   generated 2026-07-21, narrates "three different instruments over two days",
   quotes a PHQ-9 of 9/27 and a GAD-7 of 7/21, and attributes endorsed ideation
   to the PHQ-9. No PHQ-9 or GAD-7 exists for this patient. The card also
   displays a "Not enough data" badge beside the fabricated narrative.

Lower severity, also observed:

- **`anonymousId` is not unique.** The dev database holds three patients labelled
  `P-001` and two labelled `P-002`. The command palette, caseload, and alert
  queue all use it as the human-facing handle.
- **A React `forwardRef` warning** fires on every page (`SlotClone`, from a Radix
  `asChild` wrapping a function component). Twelve console errors per run;
  pre-existing, not introduced by the redesign.

### Superseded — earlier open question

Because ideation does not affect severity, **a PHQ-9 with a low total score and
item 9 endorsed generates no alert at all.** It is absent from the dashboard
alert queue (which filters `severity !== null`), absent from the counts, and
absent from the sidebar badge. The patient detail page does surface it, so the
information exists — but only for someone who already opened that patient.

Given PRODUCT.md states "a missed alert is a patient-safety failure", this looks
like the most consequential issue found in the redesign so far. It is a clinical
policy decision rather than a refactor, so it has not been changed.
`__tests__/lib/alerts.test.ts` pins the current behaviour and is labelled as
documenting a gap, not endorsing it.

---

### Phase 5 — Patient record & clinical detail

*The deepest and densest surface — the main structural rework (S1, S3).*

**Scope**
- Restructure the patient record from a six-card scroll into a navigated
  surface: persistent patient context + tabbed regions (Overview / Assessments /
  Details / Notes).
- **Record header** per the Members pin: pseudonymous identity + severity status
  pill + latest-assessment meta + overflow menu, sticky while navigating within
  the record.
- **Recessed inset data panel** for patient details and intake (Members pin's
  Age / Sex / Location / Status treatment) — labelled columns in a sub-surface,
  replacing the current full-width details card.
- Rework the session, questionnaire, and report surfaces beneath it.
- Score summary, item scores, and narrative panels rebuilt against the Phase 3
  grid language.

**Files:** `app/(dashboard)/patients/[id]/page.tsx`,
`components/patients/{patient-record-tabs,patient-profile-header,patient-details-card}.tsx`

**Status: partial — the record page is done; the surfaces beneath it are not.**
Clean build passes, 83/83 tests, `tsc` clean on touched files, contrast gate
passes, lint clean.

Delivered:

- **The record is tabbed** (Overview / Assessments / Details / Notes) instead of
  eight stacked sections. Slots are server-rendered and passed as children, so
  tabbing costs no extra fetch and the page still renders fully on the server.
- **The suicidal-ideation alert is deliberately outside the tabs**, rendered
  above them by the page. A safety warning behind a tab is a warning nobody
  sees. This is load-bearing given the alerting gap recorded in Phase 4.
- **Record header rebuilt** — severity meter + ID + badge, identity, then latest
  result and recency as one meta line (`PHQ-9 14/27 · last assessed 2 days ago ·
  6 completed assessments`). Severity is double-encoded here because this is the
  one place a misread carries clinical weight.
- **The in-page breadcrumb was removed.** Phase 2's app header already renders
  "Back to Patients"; two ways back stacked twenty pixels apart is redundancy,
  not affordance.
- **Patient details use the recessed fact panel** from the Members pin —
  label-above-value in parallel columns on an inset surface, marking
  consent-gated identity data as distinct from the clinical record.
- **Empty state for a patient with no completed assessments**, replacing a bare
  missing chart.

**Deferred, with reasons:**

- **Sticky record header.** The plan called for it, but the Phase 3 grid already
  uses a sticky table header, and two nested sticky layers at different offsets
  is precisely the kind of overlap defect that needs a browser to catch. Not
  worth shipping blind; revisit with a visual pass.
- **Session, questionnaire, and report detail pages**, and
  `score-summary-card` / `item-scores-table` / `narrative-panel`. They inherit
  the Phase 3 grid language automatically but have had no structural pass.
  These are the bulk of what remains, and belong with Phase 6.

---

### Phase 6 — Remaining surfaces

- **Scales**: list, detail, thresholds, and the new-scale wizard.
- **Batches**: list, detail, new-batch flow, patient picker, criteria bar.
- **Settings**: profile, password, notification preferences.
- **Fill flow (patient-facing)**: remove the banned glassmorphism (S7), align to
  the system while keeping the deliberately calmer, single-column patient
  register. This is the one surface where a softer tone is correct — the user is
  a patient, not a clinician.
- **Landing, legal, notifications, error/empty/loading states** across the app.

---

## 5. Micro-interaction vocabulary

Defined once in Phase 0, applied throughout. Every entry has a reduced-motion
fallback (crossfade or instant).

| Interaction | Treatment | Duration |
|---|---|---|
| Button press | Scale 0.98, no bounce | 100ms |
| Focus ring | Ring fade-in, never an outline jump | 150ms |
| Row hover | Background wash + severity rail brighten | 150ms |
| Sort change | Column header icon rotate, rows crossfade | 200ms |
| Form error | Height-reserved slide + fade, focus moves to message | 200ms |
| Submit pending | Label crossfade to spinner, width held stable | 150ms |
| Tab change | Indicator slide, content crossfade | 200ms |
| Palette open | Backdrop fade + panel rise | 200ms |
| Toast | Slide from edge, auto-dismiss | 250ms |
| Skeleton | Shimmer, respects reduced-motion | — |

Ease: `ease-out-quart` / `ease-out-expo`. No bounce, no elastic, no
page-load choreography (product register — users load into a task).

---

## 6. Risks and open items

1. ~~The Pinterest board was never read.~~ **Resolved.** Six pins were supplied
   directly. They converge with the dark screenshots on structure (§1.1),
   confirming three decisions and improving two. Residual risk: the supplied
   pins may not be the whole board. *Mitigation: owner confirms against the
   Phase 1 output before Phase 2 starts.*
2. **Density vs the references.** The screenshots are airy settings pages;
   APAS is a dense clinical tool. This plan deliberately borrows their
   *structure* and rejects their *spacing*. If the owner actually wants the
   airiness too, that conflicts with PRODUCT.md and needs an explicit decision.
3. **Threshold data availability.** Phase 3's "14/27 · cutoff 15" treatment
   assumes max score and cutoffs are reachable per scale. `lib/scale-scoring.ts`
   and the `scale-thresholds` model need verifying before Phase 3 is committed;
   if the data isn't there, the treatment degrades to score-only.
4. **Scope.** Six phases across ~23 routes and ~90 components. Phases are
   independently shippable specifically so this can stop at any boundary.
5. **DESIGN.md will need updating** once Phases 0–3 land — the token additions,
   the grid language, and the motion vocabulary all belong in it.

---

## 7. Sequence summary

| Phase | Surface | Depends on |
|---|---|---|
| 0 | Tokens, severity ink, motion, z-index | — |
| 1 | Auth ×5 | 0 |
| 2 | Shell, sidebar, header, command palette | 0 |
| 3 | Clinical data grid (shared + 10 consumers) | 0 |
| 4 | Dashboard | 0, 3 |
| 5 | Patient record, sessions, reports | 0, 2, 3 |
| 6 | Scales, batches, settings, fill flow, misc | 0, 2, 3 |
