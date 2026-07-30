# UI redesign — Task Report

**Date:** 30 July 2026
**Branch:** `feature/ui-improvement`
**Plan:** [UI_REDESIGN_PLAN.md](UI_REDESIGN_PLAN.md)

The owner's brief was that the UI "doesn't give a medical feel", that the tables
were wrong specifically, and that the whole product should be redesigned
starting from auth. Reference material was twelve images: six dark-mode
settings/integrations screenshots and six light-mode pins from a Pinterest board.

The two reference sets are in different themes and different product categories,
so their overlap was the signal worth acting on. They converge on **structure** —
grouped sidebar navigation, tabs as primary in-page IA, a search field carrying a
⌘K affordance, table headers with no grey band, values shown against their
denominator, status pills in cells, a discrete segment meter for magnitude.
Their *spacing* was deliberately rejected: those are settings pages with a dozen
rows, and APAS is a dense clinical caseload where PRODUCT.md states density is a
feature.

What the work actually turned into: about half UI, and half clinical-correctness
defects that the UI work exposed. The second half matters more.

---

## The finding that reframed the job

The severity badge — the only component carrying patient-risk signal — **failed
WCAG AA in five of eight theme/level combinations.**

`SeverityBadge` set `text-xs` in the full severity colour on a 15% tint of that
same colour. Measured text-on-tint contrast:

| Mode | Critical | High | Moderate | Low |
|---|---|---|---|---|
| Light (before) | 3.64 ✗ | 2.62 ✗ | 2.02 ✗ | 2.63 ✗ |
| Dark (before) | 3.99 ✗ | 6.50 ✓ | 8.03 ✓ | 6.64 ✓ |
| Light (after) | 5.09 ✓ | 4.96 ✓ | 4.99 ✓ | 5.18 ✓ |
| Dark (after) | 5.45 ✓ | 5.76 ✓ | 6.19 ✓ | 5.92 ✓ |

The pattern is structurally broken — a colour cannot reach 4.5:1 against a 15%
tint of itself at any hue. Fixed by splitting **fill** (tints, borders, meters)
from **ink** (text) as separate token ramps per theme.

PRODUCT.md says "accessibility is clinical safety — a missed alert is a
patient-safety failure", so this got an automated gate rather than a design
review: `scripts/check-contrast.mjs` (`yarn check:contrast`) parses the real
`app/globals.css` and fails the build on any AA regression across 34 pairings.

**The gate paid for itself three times.** It caught two severity inks sitting
outside the sRGB gamut, which browsers would have silently clipped to a colour
different from the one verified; a dark `destructive` fill at 3.83:1 introduced
while widening the surface ramp; and it drove the decision to draw the severity
meter in ink rather than fill, after measuring `severity-moderate` fill at
**2.27:1** on a light card — fine behind text, far too weak for a 4px bar that
must be seen on its own.

---

## What shipped, by phase

| Phase | Surface | Outcome |
|---|---|---|
| 0 | Tokens, motion, z-index | Severity ink ramps, widened dark surfaces, motion vocabulary, semantic z-scale, contrast gate |
| 1 | Auth ×5 | Centred card, shared `AuthCard`, animated error region, full state coverage |
| 2 | Shell | Grouped nav, ⌘K palette, breadcrumb, index/detail page widths |
| 3 | Clinical data grid | Severity meter, score denominators, unbanded sticky header, column rules |
| 4 | Dashboard | Centralised alert derivation, status band, first-run state |
| 5 | Patient record | Tabbed IA, record header, recessed fact panel |
| 6 | Scales, batches, fill flow | Numeric vocabulary, glassmorphism removed, two latent bugs fixed |

### Tokens and motion

Dark surfaces were widened and lifted off near-black. Surface separation is
judged by **OKLCH lightness delta**, not WCAG ratio — the ratio's `+0.05` term
dominates near black, so every near-black pair scores ≈1.0 regardless of how
separated it looks. ΔL went from 0.040/0.100 (card/border above background) to
0.045/0.145.

A motion vocabulary (`--ease-out-quart/quint/expo`, `--duration-fast/base/slow`)
and a semantic z-index scale replaced ad-hoc values, plus a global
`prefers-reduced-motion` baseline so later phases weren't each inventing their
own.

### Auth

Initially rebuilt as a two-panel split whose branding side carried real
instrument metadata; on review the owner asked for a centred card and the panel
was removed entirely. One composition at every breakpoint now, instead of a
mobile/desktop fork. The `--auth-panel-*` tokens went with it.

`AuthCard` and `RevealRegion` were extracted so all five screens share one banner
behaviour — an error animates a region open rather than shoving the form down the
page and losing the user's cursor position.

**The password strength meter lost its red/amber/green ramp.** A traffic-light
meter teaches the severity vocabulary — the exact four colours that mean patient
risk everywhere else — on a password field. It now runs a single-hue intensity
scale; strength is carried by bar width, the label, and the requirement
checklist.

Two latent bugs fixed in passing: signup had no `catch`, so a dropped connection
left the button spinning forever with no message; reset-password with no token
rendered a form-with-an-error instead of a terminal state with a recovery action.

`transition-all` on `Button` was also animating width, so every pending-state
label swap visibly stretched the button.

### Shell

Navigation is grouped Clinical / Library / Account. Settings had been a flat peer
of Patients, framing account configuration as a clinical destination.

The command palette runs on the already-installed `cmdk`. Its index loads on
first open rather than into every page render, and is scoped to the signed-in
clinician — a palette that could surface another practice's patient identifiers
would be a data-isolation failure, not a UI bug. Patient entries lead with the
pseudonymous id; a display name is only a secondary hint.

Detail routes get a "Back to Patients" affordance and no second crumb. The header
is a client component with no record data, so any second crumb could only be a
placeholder, and a breadcrumb reading "Detail" is worse than none.

`PageShell` gained index (`100rem`) and detail (`6xl`) widths, resolved from the
route, so the caseload table and the patient notes no longer share a measure that
suited neither.

### The clinical data grid

The owner's headline complaint. Six specific things made the caseload read as an
admin list rather than an instrument, all addressed:

```
ID          SEVERITY   SCALE    SCORE      Δ     TREND   LAST ASSESSED
APAS-0231   ▮▮▮▮       PHQ-9     14/27    ↑+3    ▁▃▅     2 days ago
                                cutoff 15
APAS-0118   ▮▮▯▯       GAD-7      8/21     ±0    ▃▂▂     5 days ago
```

Grey header band replaced by a plain surface with a rule; severity promoted from
a badge inside the Score cell to its own column, so scanning a caseload is one
vertical sweep rather than thirty separate reads; figures right-aligned in mono
with a shared edge; `14/27 · cutoff 15` in place of a bare integer; critical rows
weighted by ink, not a colour wash; sticky header and hairline column rules.

The **segment meter** encodes magnitude by the number of filled segments, so it
survives colourblindness — the colour rail originally planned would not have. It
renders `—` for unassessed patients rather than an empty meter, because
"measured, and fine" and "not measured" are different clinical claims.

The plan flagged threshold data as a risk. It wasn't: `lib/alert-rules.ts`
already held `maxScore` and per-band thresholds for PHQ-9 / GAD-7 / BDI-II. No
schema work was needed. Custom scales degrade to the bare figure rather than
inventing a denominator.

### Dashboard and patient record

`StatusBand` was three identically-shaped cards with icon, label, oversized
figure, and footnote — the hero-metric grid, an explicit ban — and three surfaces
implied three peers when a clinician reads only one of them first. It is now one
bordered band with divided segments, a third of the vertical space, no longer
competing with the alert queue beneath it.

The patient record went from eight stacked sections to tabs (Overview /
Assessments / Details / Notes), with slots server-rendered and passed as
children, so tabbing costs no extra fetch. **The suicidal-ideation alert sits
outside the tabs** — a safety warning behind a tab is a warning nobody sees.

---

## Clinical defects found and fixed

These were not in the brief. They were found by signing in and reading real data.

### 1. BDI-II item 9 was not treated as a suicide item

`computeAlerts` only checked ideation when `scale === 'PHQ9'`. On the BDI-II,
item 9 *is* the Suicidal Thoughts or Wishes item (0–3, where 2 is "I would like
to kill myself").

Patient P-004 in the dev database has a BDI-II with `item9 = 2` — an endorsed
disclosure — and the app raised **no flag on any screen**.

Fixed with an explicit per-instrument `SUICIDE_ITEM` map (`PHQ9 → 9`,
`BDI2 → 9`, any score above zero). Deliberately per-instrument rather than
positional: AUDIT item 9 asks about injury from drinking and PCL-5 has no suicide
item, and the same database has AUDIT rows with `item9 = 2` that a positional
rule would have turned into false suicide alarms.

### 2. Ideation raised no alert at all when the score was sub-threshold

`computeAlerts` reports `suicidalIdeation` as a separate boolean and never
touches `severity`. Both the alert queue and the counts filtered on
`severity !== null`, so a low-scoring PHQ-9 with item 9 endorsed was dropped
everywhere — including from a rendering branch in `AlertFeed` written to display
exactly that case, which could never fire.

Owner decision: ideation is an **independent alert condition**. It raises an
alert in parallel with severity and does not modify the severity value, so the
band stays tied to the score and the trend chart, Δ column, and score history
keep their meaning. Sub-threshold cases render a distinct **Safety flag** mark
rather than a misleading band.

`hasCurrentIdeation` was added for the same reason: the patient page's safety
banner was keyed to the single newest questionnaire, so submitting any other
instrument after a PHQ-9 silently hid the flag.

### 3. The caseload showed the newest result, not the worst current one

P-003's newest assessment is a PHQ-9 of 7 (mild), so the caseload rendered a
moderate meter — while a current PCL-5 of 51 (severe) sat in the alert queue
**on the same screen**.

A caseload row now represents the patient's **most concerning current
assessment** — scale, score, severity, threshold, and date all drawn from that
one result, so nothing within a row can disagree with anything else in it.
"Current" is the latest response per instrument; worst wins; ties break by
recency. An assessment endorsing ideation outranks every band including
critical, because only it carries a safety action.

### 4. Alert derivation was duplicated

The dashboard computed alerts inline. Adding a sidebar badge would have meant a
second definition of "critical" on the same screen. Centralised in
`lib/alerts.ts`, which is now the single source: latest response per patient +
scale, severity via `computeAlerts`, never the stored `severity` column (for
known instruments `computeAlerts` recomputes from published thresholds and only
falls back to the column for unknown scales, normalising its labels).

### 5. Patient ids could collide after a deletion

`nextAnonymousId` derived the next id from the patient **count**. With
`P-001..P-003` on file, deleting `P-002` leaves a count of 2, so the next patient
is assigned `P-003` — which still exists, violating
`@@unique([anonymousId, psychologistId])` and failing creation with an unhandled
500. The app has a delete-patient action, so it is reachable. Replaced with
`nextAnonymousIdFrom`, counting up from the highest id already issued.

### 6. A dropdown trigger silently lost its ref

`SidebarMenuButton` was a plain function component used as the child of
`DropdownMenuTrigger asChild` in `NavUser`. On React 18 that means the ref is
genuinely dropped, not merely warned about — the account dropdown lost anchored
positioning and focus return. Converted to `forwardRef`; console errors went from
12 per page load to 1.

---

## Corrections made during the work

Recorded because each one changed a decision.

- **"Dark cards are invisible at 1.02:1"** — wrong instrument. WCAG ratio
  compresses toward black, so every near-black pair scores ≈1.0 and the 1.2
  target set in the plan was unreachable. Measured by perceptual ΔL the old ramp
  was thin, not broken. The improvement is real but smaller than first described.
- **"`computeAlerts` escalates on ideation"** — it does not. The Phase 2
  deferral it justified was still correct, but for a different reason
  (threshold recomputation and label normalisation, not escalation).
- **"`anonymousId` is not unique"** — retracted. The duplicates are across four
  different clinicians, each with their own series, and the constraint already
  exists. The probe query was not scoped by clinician.
- **The severity meter was first built with fill tokens** and would have been
  nearly invisible in light mode. Caught by extending the contrast gate to
  non-text marks.
- **Ideation was first ranked equal to critical** in caseload selection; a test
  caught that a critical GAD-7 from today outranked a BDI-II ideation disclosure
  from last week. Ideation now outranks every band.

---

## Verification

`scripts/visual-check.mjs` signs in with credentials from the environment and
captures 30 screenshots — every surface, three viewports, both themes — plus a
console-error report.

```
APAS_EMAIL=… APAS_PASSWORD=… node scripts/visual-check.mjs
```

It uses the already-present `puppeteer`; no new dependency. Output goes to
`screenshots/`, which is gitignored because it contains patient data. Re-running
it after a change is the regression baseline.

Phases 0–5 were built without it, verified only by build, types, and tests. That
was a mistake: the first run immediately surfaced the caseload/alert-queue
contradiction, the missing ideation flag, and a palette clipped to five items —
none of which any amount of type-checking would have caught. It also caused at
least one conservative choice (the record header was left non-sticky rather than
risk a nested-sticky overlap defect that could not be seen).

| Check | Result |
|---|---|
| `yarn build` | clean |
| `yarn test` | 109 passing, 13 suites |
| `yarn check:contrast` | 34/34 pairings AA |
| `npx tsc --noEmit` | clean on all touched files |
| Console errors | 12 → 1 per run |

New tests: `__tests__/lib/alerts.test.ts` (16), `__tests__/lib/patient-summary.test.ts`
(7), plus additions to `alert-rules` and a rewrite of `anonymous-id`.

---

## Known gaps

- **An AI patient summary describes assessments that do not exist.** P-004 has
  one completed response (BDI-II, 2026-07-20). Its stored summary narrates
  "three different instruments over two days", quotes a PHQ-9 of 9/27 and a
  GAD-7 of 7/21, and attributes endorsed ideation to the PHQ-9. Neither
  instrument exists for that patient. The card also shows a "Not enough data"
  badge beside the fabricated narrative. This needs investigation of
  `lib/patient-summary-ai.ts` — whether the model is hallucinating or being
  handed the wrong patient's data — not a UI change. **Open, and the most
  important remaining item.**
- **Custom scales have no ideation detection.** The `SUICIDE_ITEM` map covers
  PHQ-9 and BDI-II. There is no way to know which item of a user-built scale is
  a safety item; declaring it on the scale definition is the durable fix and
  needs a schema change.
- **Sticky record header** was deferred. The data grid already uses a sticky
  header and two nested sticky layers at different offsets is an overlap defect
  best caught in a browser.
- **Filter-with-count toolbars** were deferred. Outside the batches domain's
  existing `batch-filters.ts` these tables have no defined filter model, and a
  generic filter UI with invented semantics is speculative.
- **Session, questionnaire, and report detail pages** inherit the grid styling
  but have had no structural pass.
- **One residual console warning** on a path not yet isolated, likely the mobile
  sidebar sheet.
- **DESIGN.md has not been updated** with the ink tokens, motion vocabulary, or
  grid language introduced here.
