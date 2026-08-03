# Multi-Tenancy: Practices as the Tenant — Task Report

**Date:** 2026-08-03
**Branch:** `feature/ui-improvement` · commit `b2e09c3`
**Migrations:** `20260803000000_practices_areas_memberships`, `20260803010000_row_level_security`

## Task

Turn APAS from a single-clinician tool into a multi-tenant one, where practices
register, practitioners can belong to more than one, and patients belong to a
practice rather than to an individual.

The day ran as: settle the model → write it down → plan it → build phases 0–4.
Phases 0–4 are complete and **none of them changes anything a user can see**.
That was the design goal, not an accident: the tenancy boundary had to be real
and enforced before any UI made practices visible.

---

## The correction the whole design rests on

The brief listed Abnormal, Biopsychology, Social, Cognitive, Developmental,
Personality, Forensic and Industrial-Organizational psychology as "practices to
onboard". Those are **branches of psychology** — disciplines, not businesses.

A practice is a business entity: a clinic with a licence, staff, and legal
custody of records. Had a branch become the tenant, there would be eight tenants
in the entire system and every clinic in the country would share a data
boundary. Isolation collapses on day one.

So:

- **Practice = the tenant.** Unit of isolation, billing, legal custody.
- **Area = a dimension inside it.** What a branch actually is. Used for
  organisation, filtering and referral routing — **never** a security boundary.

The rule we settled on, and the one worth repeating to anyone joining the work:
**the practice is the wall, the area is a room.** Data never crosses the wall
without an explicit, consented, logged grant. Moving between rooms is a
permission setting.

---

## Part 1 — Design documents

Three documents were written before any code, and they remain the reference:

| Document | Covers |
|---|---|
| [multi-tenancy-design.md](./multi-tenancy-design.md) | Practice/Area/Membership model, signup and invite flows, roles, patient access ladder, note visibility, referrals, alert routing, offboarding |
| [information-architecture.md](./information-architecture.md) | Canonical vocabulary, content model, navigation, URL rules, screen inventory, permission surface, placement rules |
| [tenancy-implementation-plan.md](./tenancy-implementation-plan.md) | The nine phases, what each blocks, and a running record of what actually happened |

The IA document's highest-value section turned out to be **vocabulary**.
"Session" meant three different things in this codebase — the NextAuth `Session`,
the `ClinicalSession` model, and the `/sessions/` URL segment.

An early draft of that document proposed renaming `ClinicalSession` to
`Appointment`. **That was wrong, and reading the schema properly is what caught
it:** `SessionKind` has two values, and a `DIRECT` row is explicitly *not* an
appointment — it is questionnaires sent with no appointment behind them.
`Appointment` would have been a false name for half the table. The model keeps
its name; the correction and its reasoning are recorded so it does not get
re-proposed.

---

## Part 2 — Phase 0: the seam

**No behaviour change. A pure refactor, and the highest-leverage work of the day.**

Measured first: 52 files imported the Prisma client directly, and 48 route
handlers called `getServerSession(authOptions)` inline. There was **no single
place** to inject practice context — which is exactly why this phase existed.

- `lib/session-context.ts` — `getUserContext()`, `requireUser()`,
  `unauthorized()`. All 40 affected files migrated; zero direct session lookups
  remain outside the NextAuth route.
- `lib/db.ts` — `scopedDb(ctx)`, at this stage a deliberate pass-through so call
  sites were shaped correctly before scoping became real.
- `scripts/check-tenancy-seam.mjs` — CI guard against regression.

### Two bugs the typechecker caught

The codemod renamed the context variable to `user`, which **collided with an
existing `user` binding** for a real Prisma record in three files, clobbering two
guards. `app/api/settings/profile/route.ts` and `app/(dashboard)/settings/page.tsx`
would have returned the wrong thing. The variable is now `ctx`, which also reads
better once it carries a practice.

A baseline typecheck was captured *before* any edits, so pre-existing failures
in `__tests__/lib/*`, `components/ui/chart.tsx`, `lib/format-detector.ts`,
`lib/scales-data.ts` and `lib/scoring-engine.ts` were never mistaken for new ones.

---

## Part 3 — Phase 1: the schema

Adds `Practice`, `Area`, `Membership`, `MembershipArea`, `PatientArea`,
`PracticeInvitation`, `AuditEntry` and five enums. `practiceId` lands on every
owned table.

**Ownership and authorship became separate columns**, and that split is the
heart of the migration:

- `practiceId` — who owns it. Legal custody, access boundary. Never changes.
- `psychologistId` / `authorId` — who did it. Survives that person leaving.

Patient uniqueness moved from `(anonymousId, psychologistId)` to
`(practiceId, anonymousId)`. A globally unique anonymous id would be a
correlation key across tenants — precisely what pseudonymisation prevents.

### Nullable where it is honest to be nullable

- **`Scale.practiceId`** — three ownership tiers: global library, practice-owned
  (the default), and personal, which travels with a clinician who leaves.
- **`Notification.practiceId`** — a LOGIN notification belongs to the account,
  not a practice, and is raised before any practice has been resolved. Making it
  required would have meant fabricating one.

### Data handling

The database was **not** a throwaway: `DATABASE_URL` pointed at a shared Neon
instance holding 6 accounts, 13 patients, 46 sessions, and **2 patients with
real identifying details**. A full JSON export of all 16 tables (713 rows) was
taken first via `scripts/export-database.mjs`, written to `~/apas-backups/` —
outside the repo, so it is never committed — and verified readable before
anything was dropped.

Wiping meant **Phase 2 (backfill) disappeared entirely**, removing the only
medium-risk step in the plan, and `practiceId` could be `NOT NULL` from the start.

`prisma/seed.ts` — which was wired in `package.json` but did not exist, so scales
had been seeded by hand — now creates the library scales *and* a development
practice: three areas and Owner / Clinician / Front-desk accounts. Front desk
exists in the fixture specifically so the permission boundary that hides notes
and scores has something to be tested against.

### Two findings

**Pre-existing schema drift.** `QuestionnaireResponse.reviewedAt` and
`.escalatedAt` were in `schema.prisma` and in the live database but in **no
migration**. A deploy built purely from migrations would have been missing both
columns. This migration captures them.

**A latent collision in the anonymous-ID generator.** It derived the next id from
patients matching `psychologistId`. With ids now unique per *practice*, two
clinicians in one practice would have generated the same id and collided on
insert. Now scoped by `practiceId`.

---

## Part 4 — Phase 3: enforcing the boundary

`scopedDb(ctx)` became a Prisma client extension that rewrites every query it
issues. Reads get the practice predicate merged into `where`; filtered writes get
it too, so a mismatched practice raises P2025 instead of mutating another
tenant's row; creates are stamped automatically. **A developer cannot forget the
tenant filter because they never write it.**

| Model class | Predicate |
|---|---|
| Strict — `Patient`, `ClinicalSession`, `SessionBatch`, `Questionnaire`, `Note`, `Area`, `Membership`, `PracticeInvitation`, `AuditEntry` | `practiceId = ctx` |
| `Practice` | `id = ctx` |
| `Scale` | union of practice-owned, global library, clinician's personal tier |
| `Notification` | practice-owned **or** account-level (`practiceId` null) |
| Everything else | untouched — global tables, per-user settings, children of an already-scoped parent |

### The merge bug the leak suite caught

Prisma 5's extended `where` accepts extra filters alongside a unique field —
**verified against the live database rather than assumed**, since the whole
design depends on it.

The first `mergeWhere` wrapped colliding clauses as `{ AND: [caller, predicate] }`.
That moves the unique field out of the top level and Prisma rejects the query
outright. The predicate is now appended to `AND` *alongside* the caller's keys,
so asking for another tenant's Practice by id matches nothing rather than being
silently redirected to your own.

### Call sites

All 42 files under `app/` migrated. **Zero raw `@/lib/prisma` imports remain**;
the seam guard enforces a budget of 0 and additionally checks an allowlist of 11
files that legitimately use `unscopedDb` — authentication, the patient
fill-by-token flow, and account-level settings.

Shared helpers that queried directly — `getNavCounts`, `getAlertCounts`,
`findOwnedBatch`, and four notification helpers — now take the client as their
first argument. They filtered by `psychologistId` alone, which would have bled
across practices for anyone holding two memberships. That is the dashboard's own
read path, so leaving it would have left a hole in the busiest queries in the app.

**Incidental find:** `generateMetadata` in `app/(dashboard)/scales/[id]/page.tsx`
queried **completely unguarded** — a scale's name was readable by id with no
session at all. Now behind the same practice context as the page.

### Behaviour deliberately unchanged

Reads still carry their existing `psychologistId` filters *in addition to* the
practice predicate. Phase 3 adds the wall; it does not change who sees what
inside it. The access ladder is Phase 7 — a product decision, not a plumbing one.

---

## Part 5 — Phase 4: database-level enforcement and indexes

### Indexes

`yarn check:indexes` seeds synthetic volume, runs `EXPLAIN ANALYZE`, tears down.

The first run reported two sequential scans — **the benchmark was wrong, not the
indexes.** With two practices and one clinician, half the table matched every
predicate and a seq scan was genuinely the correct plan. With realistic shape
(50 practices, 10 clinicians, 20,000 patients) all four main queries use the
tenant-leading composites in under a millisecond.

### RLS — shipped, proven, dormant

Migration `20260803010000_row_level_security` puts `ENABLE` + `FORCE` + a
deny-by-default policy on all 12 tenant tables. The predicate returns NULL when
`app.practice_id` is unset, so a connection that forgets to set the practice
**sees nothing** — the correct failure mode.

The policies are inert as shipped, for two documented reasons:

1. **The app connects as `neondb_owner`, which has `BYPASSRLS`.** Postgres
   ignores every policy for such a role, and `FORCE` does not help — FORCE
   applies RLS to a table's *owner*, while BYPASSRLS is a role attribute that
   outranks it. Enforcement needs an unprivileged role.
2. **Enforcement costs three extra round trips per query** — the practice must
   be set per query via `set_config`, requiring a transaction.

`yarn verify:rls` proves the policies are nonetheless correct: it creates a
temporary role **without** `BYPASSRLS`, connects as it, and runs 20 checks — all
passing, including cross-practice `UPDATE` affecting zero rows and
cross-practice `INSERT` rejected by `WITH CHECK`. Without this the policies could
not be tested at all; every check through the normal connection passes vacuously.

The activation runbook is in the plan document.

---

## Testing

`__tests__/integration/tenant-isolation.test.ts` — 15 tests against a real
database. Mocking Prisma here would test nothing, because the scoping lives in
the SQL Prisma generates. Skips when `DATABASE_URL` is absent.

It covers read exclusion, a caller trying to steer onto another tenant by
filter, implicit `create` stamping, rejected `update`/`delete`, bounded
`updateMany`/`deleteMany`, scoping surviving inside `$transaction`, all three
scale tiers, and account- vs practice-level notifications.

**A flake, diagnosed rather than retried.** The suite failed intermittently —
twice, both immediately after running jest twice in quick succession. The cause
was a fixed fixture tag plus a purge on startup: **two overlapping runs delete
each other's fixtures mid-test**, surfacing as foreign-key violations on rows the
suite had just created. Nothing to do with tenancy. Fixtures are now namespaced
per process, with a separate age-based sweep for rows abandoned by killed runs.
Verified by deliberately running two overlapping suites.

Test count: **116 → 138**.

---

## A measurement I retracted

A trivial indexed query measured ~210ms, and I initially called it strong
evidence for the region-mismatch hypothesis in the performance backlog. **It is
not.** TCP connect to the Neon host from this machine is also ~200ms, so that
figure is the developer laptop's distance to `us-east-1`.

The backlog has been corrected rather than left with a misleading number in a
document someone would act on. The production question remains open and is worth
30 seconds: `railway.json` pins no region, and the database is `us-east-1`.

---

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | clean across `app/` and `lib/` (pre-existing baseline failures unchanged) |
| `jest` | 138 passed, 15 suites |
| `next lint` | clean in `app/` |
| `next build` | compiles, 41 static pages |
| `prisma migrate status` | up to date |
| `yarn check:tenancy` | 0 direct session lookups, 0 raw prisma imports, 11 reviewed unscoped files |
| `yarn verify:rls` | 20/20 |
| `yarn check:indexes` | all tenant queries indexed |

---

## Where this leaves us

**Phases 0–4 are the deploy checkpoint.** The app is fully multi-tenant
internally, the boundary is enforced by `scopedDb` and proven by the leak suite,
and nothing a user can see has changed. If the work pauses, this is the correct
place to stop.

### New commands

| Command | Purpose |
|---|---|
| `yarn check:tenancy` | Guards the seam — run in CI |
| `yarn verify:rls` | Proves the RLS policies via an unprivileged probe role |
| `yarn check:indexes` | `EXPLAIN ANALYZE` under synthetic volume |
| `yarn db:export` | Full JSON backup outside the repo |

### Decisions needed before Phase 5

- **Practice slug in the URL** (`/p/[slug]/…`) — recommended, and it gets more
  expensive the longer it waits, because it touches every internal link.
- Default patient access ladder — recommended **Open** for small practices.
- Whether Areas are hidden entirely for single-clinician practices.

### Known gap

An account with no membership gets a 403 from write routes and a redirect from
pages. That is the honest state today, but **a fresh signup lands there** — until
practice onboarding ships (Phase 8), new accounts need a membership created by
the seed or by hand.

### Not built, deliberately

Cross-practice patient sharing, the linked `Person` identity, consent grants with
scope/expiry/revocation, and the snapshot-vs-live disclosure distinction. All of
it waits until a real customer needs a patient to move between two separate
businesses. Nothing in phases 0–4 blocks any of it.
