# API Performance — Backlog Note

**Status:** indexes resolved · remaining items not started · noted and updated 2026-08-03
**Trigger:** APIs feel slow. Parked while multi-tenancy (practices) is designed.

> Everything below except the index findings is a hypothesis, not a measurement.
> Nothing here has been profiled yet. Step 1 is to measure.

---

## Why this matters *before* the practice work lands

Multi-tenancy adds a `practiceId` filter to essentially every query in the app.
If the underlying indexes are wrong today, they get worse — not better — once
every read gains another predicate. Index work should land **before or with**
the tenant column, not after.

---

## 0. Resolved by the tenancy work (2026-08-03)

The index concerns below were addressed during Phase 1 and verified in Phase 4.
`yarn check:indexes` seeds synthetic volume, runs `EXPLAIN ANALYZE` and cleans
up; at 20,000 patients across 50 practices all four main patient queries use
tenant-leading composite indexes in well under a millisecond. Section 1 is kept
for the reasoning, but is no longer an open item.

**One measurement here, with a caveat, because it is easy to misread.** A
trivial indexed query measured ~210ms from a development laptop. TCP connect to
the Neon host from that machine is also ~200ms, so **that number is the
developer's distance to `us-east-1`, not a production signal.** An earlier draft
of this note treated it as evidence for the region-mismatch hypothesis in
section 2.4 — it is not.

The production question is still open and still worth 30 seconds: `railway.json`
pins no region, and the database is in `us-east-1`. Confirm the Railway service
region matches before doing anything else in this document, because if it does
not, every other item here is being measured through the wrong lens.

---

## 1. Missing indexes on foreign-key columns — RESOLVED, kept for reasoning

Postgres does **not** auto-index foreign key columns, and Prisma only creates
indexes that are explicitly declared. `prisma/schema.prisma` declares nine
`@@index` entries; several high-traffic lookup columns are not among them.

| Model | Column | Problem |
|---|---|---|
| `Patient` | `psychologistId` | `@@unique([anonymousId, psychologistId])` (schema.prisma:128) leads with `anonymousId`, so it **cannot** serve `where psychologistId = ?`. The patient list is an unindexed scan. |
| `ClinicalSession` | `psychologistId` | The three indexes (schema.prisma:169–171) are all patient-scoped. "My sessions" is an unindexed scan. |
| `Scale` | `psychologistId` | No index. |
| `Note` | author column | Indexed by `patientId` / `sessionId` / `questionnaireId` only. |

These degrade linearly with row count, so they look fine in dev and get worse
every week in production.

**Fix direction:** once `practiceId` exists, most of these should become
composite indexes *leading with the tenant column* — `(practiceId, createdAt)`,
`(practiceId, patientId)`, `(practiceId, scheduledAt)` — because every
multi-tenant query filters by tenant first. Adding single-column
`psychologistId` indexes now and tenant-leading composites later means doing
the migration twice; worth deciding which order we want.

---

## 2. Other suspects (unverified — in priority order)

1. **N+1 queries.** Sessions → per-session questionnaires → per-questionnaire
   responses. Common when `include` gets replaced by loops. Prisma query
   logging will surface these immediately.
2. **Missing pagination.** Dashboard endpoints fetching all patients / all
   sessions and slicing in JS. Check `app/api/patients/route.ts` and the
   session list routes.
3. **Scores computed on read** rather than persisted at submit time.
4. **App/database region mismatch on Railway.** Cross-region latency multiplied
   by N queries per request presents exactly as "the database is slow."
   **Check this first** — it is the cheapest item here and it changes how every
   other measurement should be read. Database is `us-east-1`; `railway.json`
   pins no region.
5. **Inline Anthropic calls in the request path** (`app/api/narrative/`). One
   slow LLM call makes a whole page feel broken. Belongs in a background job
   with polling or streaming.
6. **Connection pool sizing** under Prisma on Railway.

---

## 3. How to actually diagnose it (do this first)

1. Enable Prisma query logging in a non-prod environment; capture query count
   and duration per request for the main dashboard, patient detail, and search
   endpoints.
2. Anything issuing >10 queries for one page is an N+1 — fix those first, they
   are usually the largest single win.
3. Run `EXPLAIN ANALYZE` on the slowest three queries; confirm the scan types
   against the table above.
4. Record **before** numbers so the fix can be shown to have worked.

---

## 4. Explicitly *not* the fix

Migrating to MongoDB. It was considered alongside the multi-tenancy work and
rejected:

- The data is deeply relational (scale → items → options → thresholds →
  responses → scores → sessions → patients → notes → audit). Joins would move
  into application code, which is slower, or force denormalisation, which risks
  consistency bugs in clinical scoring data.
- It removes Postgres row-level security, the defence-in-depth layer that backs
  the shared-table tenancy model. Tenant isolation would rest entirely on every
  developer remembering the `practiceId` filter.
- Mongo's strength is high-volume schemaless writes. This workload is
  moderate-volume reads of highly structured records.

None of the causes listed above are addressed by changing database engine — all
of them follow us across.
