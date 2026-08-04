# Tenancy Implementation Plan

**Status:** phases 0–7 done · phase 2 dropped · RLS shipped dormant · drafted and last updated 2026-08-04
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

## Phase 5 — Practice context becomes real ✅ done 2026-08-03

**The first phase a user can see.**

### Slug in the path

Decided and shipped: every tenant-owned URL is `/p/<slug>/…`. The four route
trees moved under `app/(dashboard)/p/[practiceSlug]/`; `/settings` stayed put,
because it belongs to the human rather than any practice.

The slug is authoritative. Middleware lifts it out of the pathname into a
request header (`x-practice-slug`), stripping any inbound value first so a
client cannot name a practice the URL never mentioned. `getPracticeContext()`
reads it there — server components cannot see the pathname, and threading a
param through every page and helper would mean every data access having to be
told which practice it is in.

Resolution order: **URL slug → last-used cookie → earliest membership.** The
cookie is a preference, not a grant; access is always re-derived from
membership, so a tampered value selects nothing the user could not already
reach.

**The security-critical branch:** when the URL names a practice the user has no
active membership in, resolution returns null rather than falling back. Falling
back would render one practice's records under another practice's URL. Covered
by a test that asserts only one lookup happens — no cookie or first-membership
fallback is attempted.

### Link prefixing

Two idioms, because server and client components need different mechanisms:

- **Client:** `usePracticeHref()` from the `PracticeProvider` the shell hands down.
- **Server:** `practiceHref()` from `lib/practice-path-server.ts`, reading the
  same header.

`practicePath()` is idempotent and skips account paths (`/settings`, `/auth`,
`/legal`, `/fill`), so a caller can pass any internal path without first working
out which kind it is. Both properties are tested — double-prefixing and a
prefixed `/settings` are the two failure modes that would otherwise appear as
404s in odd corners of the app.

### The switcher

Top of the sidebar, above everything it scopes. It shows the practice name
always, and only becomes a menu when there is more than one practice — a
disabled control would be noise for the single-practice case, but never showing
whose records are on screen would be worse.

Switching keeps the **section** and drops record ids: patient `abc` in one
practice is not patient `abc` in another, so carrying the full path across would
reliably 404. `/p/a/patients/abc/sessions/xyz` → `/p/b/patients`.

### Legacy links

Bookmarks and notification emails point at `/patients/123` with no practice.
Middleware forwards those to `/practice-redirect`, which resolves a practice and
re-issues the URL with the path preserved. It refuses any `to` that is not a
plain internal path — an open redirector is a phishing gadget.

`/no-practice` is where an account with no membership lands, until practice
onboarding ships in Phase 8.

### The suicidal-ideation exception

`listIdeationAlertsElsewhere()` deliberately takes the **unscoped** client and
surfaces unread ideation alerts from the user's *other* practices, labelled with
the practice they came from. Scoping is a privacy mechanism; it must never
become the reason an alert like this goes unseen. It is still confined to this
user's own notifications in practices they actively belong to, and the route is
on the reviewed `unscopedDb` allowlist with that reasoning attached.

### Verified against a running server

Not just a passing build — signed in as the seeded owner and probed the routes:

| Request | Result |
|---|---|
| `/dashboard` (legacy) | 307 → `/practice-redirect?to=/dashboard` |
| `/p/renaissance/dashboard` | 200, practice name in shell, nav links all prefixed, no unprefixed leftovers |
| `/p/renaissance/patients` | shows P-001, P-002 — the owner's caseload |
| `/p/not-my-practice/dashboard` | redirects out; **zero patient names, zero practice name in the response** |
| `/settings` | 200, unprefixed |
| unauthenticated anything | 307 → sign-in, callbackUrl preserved including the practice path |

`T. Eze` (the other clinician's patient) is correctly absent: reads still carry
their `psychologistId` filter, which remains the deliberate Phase 3 behaviour
until the access ladder lands in Phase 7.

**Known rough edge:** when the URL names a practice the user is not in, the
redirect is issued after streaming has begun, so Next serves a 200 with a
one-second meta-refresh instead of a clean 307. Functionally correct and no data
is exposed, but it is a visible pause. Fixing it properly needs the membership
check to happen before render, which middleware cannot do without a database
lookup. `/practice-redirect` and `/no-practice` avoid this by sitting behind the
auth matcher.

**Verified:** typecheck clean across `app/`, `lib/` and `components/`, 151 tests
across 16 suites, lint clean for changed files, `next build` succeeds with all
`/p/[practiceSlug]/…` routes present, seam guard passing.

---

## Phase 6 — Multiple people per practice ✅ done 2026-08-04

**The second visible product phase.** People can invite colleagues, accept into
a second practice without creating a second account, and leave — with the role
matrix enforced on nav and the clinical APIs that matter most.

### Invitations

`PracticeInvitation` was already in the schema; this phase wired the product
surface:

- Owner/Admin create from `/p/<slug>/team` — role chosen up front (never Owner).
- Email via the existing mailer (logged in dev); existing users also get an
  in-app `PRACTICE_INVITATION` notification.
- Accept at `/invitations/[token]` — public peek, session required to act.
- **Existing-user path:** email match → one-click accept → second membership,
  same `User` row. Covered by the integration suite.
- Revoke, decline, opportunistic expiry (7 days). Pending invites surface on
  `/no-practice` for accounts that have nowhere to land yet.
- Practices in `PENDING_VERIFICATION` cannot invite (verification gate).

### Team screen

`/p/<slug>/team` — members (role, status, caseload count), pending invitations,
role changes, offboarding. Nav item sits in a Practice group and is **omitted**
for anyone without `manageTeam`, never greyed out.

### Role enforcement

`lib/roles.ts` holds the capability matrix from the IA doc. Applied to:

- Team APIs and page (Owner/Admin)
- Notes APIs + Notes UI (not Admin, not Front desk)
- Scores / narrative APIs + report page + score tabs (same)

Front desk can still schedule and see patients; they cannot read notes or
scores. Admin can run the practice; they cannot read clinical content.

### Offboarding

Membership → `DEPARTED` with `leftAt` set. Row kept. Blocked while the member
is still the responsible clinician for any patient. Last Owner cannot leave.
Audit entries written for invite/accept/decline/revoke/role-change/offboard.

### Seed

Harbor Clinical Centre (`harbor`) added alongside Renaissance.
`owner@apas.test` is **Owner** at renaissance and **Clinician** at harbor —
the Phase 6 verification fixture for multi-practice different roles.

**Verified:** unit + integration tests for roles, invitation helpers, accept /
revoke / decline / offboard-with-patients; seam guard unchanged (invitation
flows use `unscopedDb` inside `lib/`, not under `app/`).

---

## Phase 7 — Areas, care teams, referrals ✅ done 2026-08-04

**Life inside the wall.** Areas are rooms; the practice is still the only
security boundary. Sharing a patient is adding an area or a care-team member —
no consent grant.

### Access ladder

`Practice.patientAccess` — `OPEN` (default) / `AREA_SCOPED` / `ASSIGNED_ONLY`.
Editable on `/p/<slug>/areas`. Owner/Admin always see the full caseload;
everyone else follows the ladder via `patientVisibilityWhere()` /
`findAccessiblePatient()`. Patient list, dashboard, detail, and notes use it.

### Areas

CRUD at `/p/<slug>/areas` (Owner/Admin). Assign on patient Details tab and at
invite time (`PracticeInvitation.areaIds` → `MembershipArea` on accept).

### Care teams

`CareTeamMember` model. Managed on the patient Details tab. Feeds ASSIGNED_ONLY
and AREA_SCOPED visibility.

### Referrals

`Referral` workflow: drafted → sent → accepted/declined → in progress →
completed. Inbox/outbox at `/p/<slug>/referrals`. Nav appears only when the
practice has at least one area. Accept adds the target area and puts the
receiver on the care team.

**Verified:** unit tests for access ladder + roles; integration tests for
referral accept/decline side effects.

---

## Phase 8 — Onboarding and settings ✅

### Practice creation and verification

Self-serve at `/onboarding` (also linked from `/no-practice`). Creates a
`PENDING_VERIFICATION` practice, Owner membership, and default areas.
Activation is Owner-only once registration number + contact email are present
(`POST /api/practice/activate`). Until `ACTIVE`, patient create and invites
return 403 (`practiceNotActive`). Banner in the shell points Owners/Admins at
practice settings.

### Settings split

- **Practice** — `/p/<slug>/settings` (Owner/Admin): profile, branding tagline,
  activate, access ladder.
- **Account** — `/account` (per human): profile, password, notifications.
  Legacy `/settings` redirects here. Practice nav uses relative `/settings` for
  the practice page (prefixed by `practicePath`).

### Branding and legal

Fill shell and consent name the practice as controller; APAS is the platform.
Optional tagline from `Practice.settings.branding.tagline`. `/legal/*` updated.

### Billing

`/p/<slug>/billing` (Owner): seats = `ACTIVE` memberships; checkout placeholder
(no Stripe yet). `GET /api/billing/seats`.

**Verified:** unit tests for slug helpers, practice gate, practice-path account
vs practice settings.

---

## Sequencing summary

| Phase | Visible? | Risk | Blocks |
|---|---|---|---|
| ✅ 0 · Seam | No | Low | everything |
| ✅ 1 · Schema | No | Low | 3 |
| ~~2 · Backfill~~ | — | — | dropped — database was wiped instead |
| ✅ 3 · Scoping + leak tests | No | Medium | 4, 5 |
| ✅ 4 · RLS + indexes | No | Low–Med | — |
| ✅ 5 · Context + switcher | **Yes** | Medium | 6 |
| ✅ 6 · Invitations + team | Yes | Medium | 7 |
| ✅ 7 · Areas + referrals | Yes | Low | — |
| ✅ 8 · Onboarding + billing | Yes | Low | — |

---

## Decisions needed before we start

**Resolved:**
- ~~Role list~~ — Owner / Admin / Clinician / Supervisor / Front desk, shipped
  as `MembershipRole`.
- ~~`ClinicalSession` rename~~ — kept. `SessionKind.DIRECT` rows are not
  appointments, so `Appointment` would have been a false name for half the table.

**Resolved in Phase 8:**
- ~~No-membership signup~~ — `/no-practice` → `/onboarding` or accept invite.
- ~~Self-serve vs sales-verified~~ — self-serve create → `PENDING_VERIFICATION`;
  activate when registration number + contact email present. A human review
  queue can replace activation later without changing the status field.
- ~~Billing seat definition~~ — seats = ACTIVE memberships (a clinician in three
  practices costs three seats). Checkout not wired yet.

**Resolved:**
- ~~Practice slug in the URL path~~ — decided and shipped in Phase 5 as
  `/p/<slug>/…`.

**Resolved in Phase 7:**
- ~~Default patient access ladder~~ — **Open**.
- ~~Hide Areas for solo practices~~ — shown whenever the actor can `manageAreas`;
  empty state explains what they are. No special hide.

---

## What we are not building

Cross-practice patient sharing, the linked `Person` identity, consent grants
with scope/expiry/revocation, snapshot-vs-live disclosure. Deferred until a real
customer needs a patient to move between two separate businesses. Nothing in
phases 0–8 blocks it.
