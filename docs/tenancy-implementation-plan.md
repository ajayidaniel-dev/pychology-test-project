# Tenancy Implementation Plan

**Status:** phases 0–4 done · phase 2 dropped · RLS shipped dormant · drafted and last updated 2026-08-03
**Design:** [multi-tenancy-design.md](./multi-tenancy-design.md) · [information-architecture.md](./information-architecture.md)

---

## The governing idea

**Phases 0–4 ship with zero user-visible change.** They move the app from
"psychologist is the tenant" to "practice is the tenant" while every screen
behaves exactly as it does today, because each existing psychologist becomes a
solo practice containing only themselves.

That property is what makes this safe. Each phase is independently deployable
and independently revertible, and if something is wrong we find out with one
person's data in one practice — not after the switcher has shipped and people
are moving between practices.

Phases 5+ are the visible product. **Do not reorder.** Building the UI before
the boundary is enforced is how boundaries end up half-enforced.

### Starting state, measured before Phase 0

- 52 files import the Prisma client directly.
- 48 API route handlers call `getServerSession(authOptions)` inline. There is no
  shared auth helper — so there is currently **no single place** to inject
  practice context.
- `prisma/schema.prisma` declares 9 indexes; several foreign-key columns used
  for the app's main list queries are unindexed (see
  [api-performance-backlog.md](./api-performance-backlog.md)).
- Migrations are hand-named `YYYYMMDDHHMMSS_description`.

The missing auth helper is the most important of those. It is why Phase 0 exists.

---

## Phase 0 — Build the seam ✅ done 2026-08-03

**Goal:** create the single chokepoint that every later phase depends on.
**Behaviour change:** none. This is a pure refactor.

1. Add `lib/session-context.ts` exporting `requireUser()` — wrapping
   `getServerSession(authOptions)`, returning the user or throwing a typed 401.
2. Migrate all 48 route handlers to it. Mechanical, reviewable, boring.
3. Add `lib/db.ts` exporting a `scopedDb(context)` accessor. In Phase 0 it just
   returns the Prisma client unchanged — it exists so the call sites are ready.
4. Lint rule (or CI grep) forbidding new direct `@/lib/prisma` imports outside
   `lib/db.ts`.

**Verification:** full test suite green, every route still returns what it did.
**Risk:** low. **Size:** one large but mechanical PR.

> This phase looks like it does nothing. It is the highest-leverage work in the
> plan — without it, Phase 3 means editing 52 files under time pressure with a
> half-migrated schema.

---

## Phase 1 — Schema ✅ done 2026-08-03

Migration `20260803000000_practices_areas_memberships`.

Adds `Practice`, `Area`, `Membership`, `MembershipArea`, `PatientArea`,
`PracticeInvitation`, `AuditEntry`, plus enums `PracticeStatus`, `Specialty`,
`MembershipRole`, `MembershipStatus`, `InvitationStatus`.

`practiceId` added to `Patient`, `ClinicalSession`, `SessionBatch`,
`Questionnaire`, `Note` (NOT NULL), `Scale` (nullable — global library and
personal tiers have no practice), and `Notification` (nullable — LOGIN belongs
to the account, not a practice, and is raised before a practice is resolved).

Patient uniqueness moved from `(anonymousId, psychologistId)` to
`(practiceId, anonymousId)`. Tenant-leading composite indexes added throughout,
which absorbed most of the Phase 4 index work.

### What changed versus the original plan

- **`practiceId` is NOT NULL, not nullable.** The database was deliberately
  emptied (backup first — see below), so there was nothing to backfill.
- **Phase 2 is dropped entirely.** No backfill, no reverse migration, no
  snapshot rehearsal. This removed the only medium-risk step in the plan.
- **A slice of Phase 3 came forward.** NOT NULL means every write must supply a
  practice, so `getPracticeContext` / `requirePracticeContext` /
  `practiceContextFailure` landed now and seven write sites use them. Reads are
  still scoped by `psychologistId` only — completing that is still Phase 3.
- **`ClinicalSession` keeps its name.** The rename to `Appointment` proposed in
  the IA doc was wrong: `SessionKind.DIRECT` rows are explicitly *not*
  appointments. See the IA vocabulary section.
- **Pre-existing drift repaired.** `QuestionnaireResponse.reviewedAt` and
  `.escalatedAt` existed in `schema.prisma` and in the live database but in no
  migration — a deploy built purely from migrations would have lacked them.

### Data handling

Full JSON export of all 16 tables (713 rows) taken before the wipe via
`node scripts/export-database.mjs`, written to `~/apas-backups/` — outside the
repo, so it is never committed. `pg_dump` was unavailable on the machine; for a
dataset this size the JSON export is complete and re-importable.

`prisma/seed.ts` now creates the library scales *and* a development practice:
Renaissance Psychological Services, three areas, an Owner / Clinician /
Front-desk account, three patients with sessions and questionnaires. Idempotent.
Credentials are printed by the seed; override with `SEED_PASSWORD`.

**Verified:** `prisma validate`, `migrate status` clean, typecheck clean across
`app/` and `lib/`, 123 tests passing, lint clean in `app/`, `next build`
succeeds, tenancy seam guard passing.

---

## Phase 3 — Enforce the boundary in code ✅ done 2026-08-03

**`scopedDb(ctx)` now genuinely scopes.** It is a Prisma client extension that
rewrites every query it issues:

- reads (`findUnique`, `findFirst`, `findMany`, `count`, `aggregate`, `groupBy`)
  get the practice predicate merged into `where`
- filtered writes (`update`, `delete`, `updateMany`, `deleteMany`, `upsert`)
  get it too, so a mismatched practice raises P2025 instead of mutating another
  tenant's row
- `create` / `createMany` / `upsert.create` are stamped with the practice
  automatically — a developer cannot forget the tenant filter because they never
  write it

Three model classes are handled differently, and the distinction matters:

| Class | Predicate |
|---|---|
| Strict (`Patient`, `ClinicalSession`, `SessionBatch`, `Questionnaire`, `Note`, `Area`, `Membership`, `PracticeInvitation`, `AuditEntry`) | `practiceId = ctx` |
| `Practice` | `id = ctx` |
| `Scale` | union of practice-owned, global library, and the clinician's personal tier |
| `Notification` | practice-owned **or** account-level (`practiceId` null) |
| Everything else | untouched — global tables, per-user settings, and children reached through an already-scoped parent |

### Two implementation details worth knowing

**Prisma 5's extended `where` accepts extra filters alongside a unique field**
(verified against the live database, not assumed). That is what lets a single
uniform predicate cover `findUnique`, `update` and `delete` rather than needing
a separate post-filter path.

**Merging is by spread, with an `AND` fallback that preserves top-level keys.**
Wrapping as `{ AND: [caller, predicate] }` moves the unique field out of the top
level and Prisma rejects the query — this was caught by the leak suite. When the
caller already constrains a predicate key (asking for a Practice by id, say),
the predicate is appended to `AND` *alongside* their keys, so a request for
another tenant's row matches nothing rather than being silently redirected to
the caller's own.

### Call sites

All 42 files under `app/` migrated. **Zero raw `@/lib/prisma` imports remain**
under `app/`; the seam guard now enforces a budget of 0.

Eleven files use `unscopedDb`, each on a reviewed allowlist in
`scripts/check-tenancy-seam.mjs`: authentication and account recovery (no
session yet), the patient fill-by-token flow (authenticated by a single-use
token that already identifies one session; the patient has no account), and
account-level settings (about the human, not any practice).

Shared helpers in `lib/` that queried directly — `getNavCounts`,
`getAlertCounts`, `findOwnedBatch`, and the four notification list/read helpers
— now take a `PrismaLike` client as their first argument, so a caller holding a
scoped client keeps its filter all the way down. Previously these filtered by
`psychologistId` alone, which would bleed across practices for anyone holding
two memberships.

### Behaviour deliberately unchanged

Reads still carry their existing `psychologistId` filters *in addition to* the
practice predicate, so each clinician still sees their own caseload. Phase 3
adds the wall; it does not change who can see what inside it. The patient access
ladder (Open / area-scoped / assigned-only) is Phase 7.

### The leak suite

`__tests__/integration/tenant-isolation.test.ts` — 15 tests, real database.
Mocking Prisma here would test nothing, because scoping is enforced by the SQL
Prisma generates. Skips automatically when `DATABASE_URL` is absent.

Covers: `findMany` / `findUnique` / `findFirst` / `count` exclusion, a caller
trying to steer the query onto another tenant by filter, cross-practice
`Practice` and `Membership` reads, implicit `create` stamping, rejected
`update` / `delete`, bounded `updateMany` / `deleteMany`, scoping surviving
inside `$transaction`, all three scale tiers, and account-level vs
practice-level notifications.

It purges its fixtures *before* seeding as well as after — a run killed
part-way would otherwise poison every later run with a unique-constraint
failure.

**Verified:** typecheck clean across `app/` and `lib/`, 138 tests passing across
15 suites (three consecutive full runs), lint clean in `app/`, `next build`
succeeds, seam guard passing.

---

## ~~Phase 2 — Backfill~~ — dropped

The database was wiped instead (backup first), so there was nothing to backfill.
See Phase 1.

---

## Phase 4 — Database-level enforcement and indexes ✅ done 2026-08-03

### Indexes: verified, not assumed

`yarn check:indexes` seeds synthetic volume, runs `EXPLAIN ANALYZE`, and tears
it down. The volume matters: at low row counts Postgres correctly prefers a
sequential scan, so a healthy index and a useless one look identical. The data
shape matters too — the first version used two practices and one clinician, so
half the table matched every predicate and a seq scan was genuinely the right
plan. It now generates 50 practices and 10 clinicians.

At 20,000 patients, all four main queries use the tenant-leading composites:

| Query | Plan | Index |
|---|---|---|
| patient list `(practiceId, createdAt DESC)` | index scan, 0.2ms | `Patient_practiceId_createdAt_idx` |
| patient count for practice | bitmap index scan, 0.5ms | `Patient_practiceId_createdAt_idx` |
| patient by `anonymousId` in practice | index scan, 0.0ms | `Patient_practiceId_anonymousId_key` |
| caseload by responsible clinician | bitmap index scan, 0.3ms | + `Patient_psychologistId_idx` |

### RLS: shipped, correct, and deliberately dormant

Migration `20260803010000_row_level_security` enables RLS with `FORCE` and a
deny-by-default policy on all 12 tenant tables.

The predicate is `current_setting('app.practice_id', true)`, which returns NULL
when unset — the comparison then yields NULL rather than true and the row is
filtered out. **A connection that forgets to set the practice sees nothing**,
which is the right failure mode. `Scale` and `Notification` additionally permit
their `practiceId IS NULL` rows, because the global scale library and
account-level notifications belong to no tenant.

**The policies do not currently enforce anything, and that is intentional.**
Two facts drove it:

1. **The app connects as `neondb_owner`, which has `BYPASSRLS`.** Postgres
   ignores every policy for such a role. `FORCE ROW LEVEL SECURITY` does *not*
   help — FORCE makes RLS apply to a table's owner, while BYPASSRLS is a role
   attribute that outranks it. Enforcement requires pointing `DATABASE_URL` at
   an unprivileged role.
2. **Enforcement costs three extra round trips per query.** The practice has to
   be set per query via `set_config`, which requires a transaction: BEGIN,
   set_config, query, COMMIT. Measured locally at 210ms → 950ms, though that
   machine is ~200ms from `us-east-1` so the absolute figures are dominated by
   distance; colocated the cost is roughly 2ms → 8ms.

Given the app already has an open latency question, activation waits until the
app and database are confirmed colocated. Until then, isolation is enforced by
`scopedDb` and covered by the 15-test leak suite.

#### Proving dormant policies are correct

`yarn verify:rls` creates a temporary role **without** `BYPASSRLS`, connects as
it, exercises the policies, and drops the role. Without this the policies could
not be tested at all — every check through the normal connection passes
vacuously, because the connecting role bypasses them.

All 20 checks pass: 10 strict tables return zero rows with no practice set,
`Scale`/`Notification` expose no practice-owned rows, only the active practice
is visible once set, the global library stays readable, cross-practice `UPDATE`
affects zero rows, and cross-practice `INSERT` is rejected by `WITH CHECK`.

#### Activation runbook

Not done yet. When the app and database are colocated:

1. Create an unprivileged role and grant it:
   ```sql
   CREATE ROLE apas_app LOGIN PASSWORD '<from secret store>' NOBYPASSRLS;
   GRANT USAGE ON SCHEMA public TO apas_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO apas_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO apas_app;
   ```
   Migrations keep running as `neondb_owner` — only the app switches.
2. Change `scopedDb` to wrap each operation in a transaction that calls
   `set_config('app.practice_id', ctx.practiceId, true)` first.
3. Point `DATABASE_URL` at `apas_app` — locally **and** in Railway.
4. Re-run `yarn verify:rls` and the leak suite.

---

## Phase 5 — Practice context becomes real

**First user-visible phase.**

1. Active practice stored in the session; practice switcher at the top of the
   sidebar (not the account menu — see IA §4).
2. **Scope global search and the command palette.** Highest-risk surface; must
   land with this phase, not after.
3. Practice-scoped notifications, with the suicidal-ideation alert exception
   (surfaces regardless of active context, labelled with its practice).
4. Slug in the URL — `/p/[slug]/…` — if that decision is confirmed. Cheaper now
   than after more links exist.

**Verification:** switch practices, confirm every list, search result and badge
changes. Manual QA matters here in a way it did not for 0–4.
**Risk:** medium — the first phase where a mistake is visible to users.

---

## Phase 6 — Multiple people per practice

1. Invitations: create, send, accept, revoke, expire.
2. The **existing-user accept path** — one click, in-app, no second signup. This
   is the flow that makes multi-practice work and the one usually built badly.
3. Team screen: members, roles, status, offboarding.
4. Role enforcement across API and navigation — filtered, never
   rendered-then-disabled.
5. Offboarding: membership → `departed`, access ends, authorship persists, block
   if patients would be left unassigned.

**Verification:** a test user holding memberships in two practices with
different roles behaves correctly in both.
**Risk:** medium.

---

## Phase 7 — Areas, care teams, referrals

1. Area CRUD; assign memberships and patients to areas.
2. Patient access ladder (Open / area-scoped / assigned-only) as a practice setting.
3. Care teams on patients.
4. Internal referrals: the `drafted → sent → accepted/declined → in progress →
   completed` workflow, with an inbox and outbox.

**Risk:** low — additive on a solid foundation.

---

## Phase 8 — Onboarding and settings

1. Practice creation flow, verification gate, areas setup.
2. Split `/settings` into Practice (role-gated) and Account (per human).
3. Practice branding on questionnaire links; rewrite `/legal/*` to name the
   practice as data controller.
4. Billing: seats = active memberships.

---

## Sequencing summary

| Phase | Visible? | Risk | Blocks |
|---|---|---|---|
| ✅ 0 · Seam | No | Low | everything |
| ✅ 1 · Schema | No | Low | 3 |
| ~~2 · Backfill~~ | — | — | dropped — database was wiped instead |
| ✅ 3 · Scoping + leak tests | No | Medium | 4, 5 |
| ✅ 4 · RLS + indexes | No | Low–Med | — |
| 5 · Context + switcher | **Yes** | Medium | 6 |
| 6 · Invitations + team | Yes | Medium | 7 |
| 7 · Areas + referrals | Yes | Low | — |
| 8 · Onboarding + billing | Yes | Low | — |

---

## Decisions needed before we start

**Resolved:**
- ~~Role list~~ — Owner / Admin / Clinician / Supervisor / Front desk, shipped
  as `MembershipRole`.
- ~~`ClinicalSession` rename~~ — kept. `SessionKind.DIRECT` rows are not
  appointments, so `Appointment` would have been a false name for half the table.

**Known gap, deferred to Phase 8:**
- An account with no membership currently gets a 403 from write routes and a
  redirect to sign-in from pages. That is the honest state today, but a fresh
  signup lands there. Practice onboarding is what fixes it — until then, new
  accounts need a membership created by the seed or by hand.

**Blocking Phase 5:**
- Practice slug in the URL path (recommended).

**Not blocking, decide by Phase 7:**
- Default patient access ladder (recommended: Open).
- Whether Areas are hidden for single-clinician practices.

**Not blocking, decide by Phase 8:**
- Self-serve vs sales-verified practice creation.
- Billing: seats = memberships, so a clinician in three practices costs three
  seats. Commercial call.

---

## What we are not building

Cross-practice patient sharing, the linked `Person` identity, consent grants
with scope/expiry/revocation, snapshot-vs-live disclosure. Deferred until a real
customer needs a patient to move between two separate businesses. Nothing in
phases 0–8 blocks it.
