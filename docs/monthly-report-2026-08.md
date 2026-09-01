# Monthly Report — August 2026

One theme ran through the whole month: **turning a single-tenant app into a real
multi-tenant product.** Practice is the tenant; area is a dimension inside it.
Phases 0 through 8 all landed, plus the product docs that describe the result.

Delivered across four commits on `feature/ui-improvement`, merged to `main` as
PR #15 on 2026-08-04.

---

## What shipped

### Phases 0–4 — the boundary (2026-08-03)

The unglamorous half, and the half everything else depends on.

- **The seam.** `lib/session-context.ts` and a `scopedDb` wrapper in `lib/db.ts`
  became the single place a query learns which practice it belongs to. Every
  API route and server page was routed through it — roughly 50 route files
  rewritten in one pass.
- **The schema.** `prisma/schema.prisma` grew `Practice`, `Membership`,
  `MembershipRole`, and practice keys on every tenant-owned table, with two
  migrations. Nullable only where nullability is honest.
- **Enforcement.** A tenant-isolation leak suite
  (`__tests__/integration/tenant-isolation.test.ts`) proves cross-practice reads
  return nothing. It caught a real merge bug during the port.
- **Database-level backstop.** RLS policies shipped and proven by an
  unprivileged probe role, but left dormant — the app boundary is the one in
  force. Indexes verified with `EXPLAIN ANALYZE` under synthetic volume rather
  than assumed.
- **New commands:** `yarn check:tenancy`, `yarn verify:rls`,
  `yarn check:indexes`, `yarn db:export`.

Nothing a user could see changed. That was the point — it was a safe stopping
place, and we didn't stop.

### Phase 5 — practice context becomes visible (2026-08-03)

Every dashboard route moved under `/p/[practiceSlug]/…`. That meant rewriting
internal links across ~30 components, a `PracticeProvider`, a practice switcher,
and redirect handling for legacy URLs. Verified against a running server, not
just the test suite. Phase 2 (backfill) was dropped as unnecessary.

### Phase 6 — team and invitations (2026-08-04)

Invite by email with a role chosen up front; accept / decline / revoke /
7-day expiry; existing users can join a second practice on the same account.
Team screen with member list, pending invites, role changes, and offboarding.
The role matrix is enforced on team, notes, and scores. Invites are blocked
while a practice is `PENDING_VERIFICATION`.

### Phase 7 — areas, care teams, referrals (2026-08-04)

- **Patient access ladder:** `OPEN` / `AREA_SCOPED` / `ASSIGNED_ONLY`, defaulting
  to Open.
- **Areas CRUD** at `/p/<slug>/areas`, assignable on patient Details and at
  invite time.
- **Care teams** on the patient record.
- **Referrals** with a full lifecycle — draft → send → accept/decline →
  in progress → complete — an Inbox/Outbox board, a History tab, and side
  effects on accept (target area added, receiver joins the care team).

### Phase 8 — onboarding, settings, billing (2026-08-04)

Self-serve practice creation at `/onboarding` (lands in
`PENDING_VERIFICATION` with an Owner and default areas), Owner activation via
registration number and contact email, a verification banner in the shell, and
practice settings at `/p/<slug>/settings`. Account settings split out to
`/account` with a redirect from legacy `/settings`. The patient-facing fill and
consent screens are now branded with the practice as data controller. Owner
billing page counts seats as ACTIVE memberships; checkout is a placeholder.

This closed the month's biggest known gap: a fresh signup used to land with no
membership and no way out.

---

## Testing

New and expanded suites for roles, invitations, offboarding, the access ladder,
referral side effects, practice slugs, practice paths, session context, patient
access, and notifications — alongside the two integration suites for tenant
isolation and team invitations. A TypeScript cleanup pass at the end of the
month fixed Phase 8 errors and some pre-existing ones.

---

## Documentation

- `docs/multi-tenancy-design.md` — the governing design.
- `docs/tenancy-implementation-plan.md` — phase-by-phase plan, kept current.
- `docs/tenancy-report.md` — narrative report on Phases 0–5.
- `docs/tenancy-tasks-2026-08-04.md` — Phase 6–8 checklist, all complete.
- `docs/information-architecture.md` — rewritten for the shipped tenancy.
- `docs/prd.md` — new product requirements document.
- `docs/md-to-docx.md` plus a Markdown → DOCX pipeline (with a table-width fix);
  IA and PRD exported to Word.
- `docs/api-performance-backlog.md` — measured, not guessed.
- Retired: the batch-questionnaires, direct-sends, and UI-redesign reports, and
  the UI redesign plan — superseded by the work above.

---

## UX polish

Loaders on Phase 6–8 mutation CTAs; a practice-switch blur overlay
("Loading {name}…") portalled above navbar and sidebar; the referrals History
tab.

---

## Open items

- **Billing checkout is not wired.** Seat counting works; payment does not.
- **RLS is dormant.** Shipped and proven, but the app-level boundary is what
  enforces isolation today.
- **Practice verification is manual.** Activation checks that a registration
  number and contact email exist. A human review queue can replace it later
  without changing the status field.

### Deliberately not built

Cross-practice patient sharing, the linked `Person` identity, consent grants
with scope/expiry/revocation, and the snapshot-vs-live disclosure distinction.
These wait until a real customer needs a patient to move between two separate
businesses. Nothing in Phases 0–8 blocks them.
