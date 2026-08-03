// lib/db.ts
//
// The tenancy chokepoint.
//
// `scopedDb(ctx)` returns a Prisma client that injects the practice filter into
// every query it issues. A developer cannot forget the tenant predicate,
// because they never write it.
//
// This is defence in depth, not the only defence: Phase 4 adds Postgres
// row-level security underneath, so the database refuses cross-tenant reads
// even when application code is wrong. See docs/tenancy-implementation-plan.md.

import prisma from '@/lib/prisma'
import type { PracticeContext } from '@/lib/session-context'

/**
 * Models whose every row belongs to exactly one practice. `practiceId` is NOT
 * NULL on all of them, so the predicate is a simple equality.
 */
const STRICT_TENANT_MODELS = new Set([
  'Patient',
  'ClinicalSession',
  'SessionBatch',
  'Questionnaire',
  'Note',
  'Area',
  'Membership',
  'PracticeInvitation',
  'AuditEntry',
])

const READ_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])

/**
 * Writes that select rows before acting. Prisma 5 accepts extra filters
 * alongside a unique field here (extendedWhereUnique), so a mismatched practice
 * raises P2025 rather than mutating another tenant's row.
 */
const FILTERED_WRITE_OPERATIONS = new Set([
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
])

type WhereObject = Record<string, unknown>

/**
 * The predicate that limits a model to the current practice, or null for models
 * that carry no practice of their own.
 *
 * Null covers three different situations, all legitimate:
 *   - global tables (User, VerificationToken)
 *   - children reached through a scoped parent (ScaleItem, ResponseOption,
 *     QuestionnaireResponse, join tables)
 *   - per-user settings (NotificationPreference)
 */
function tenantPredicate(
  model: string | undefined,
  context: PracticeContext,
): WhereObject | null {
  if (!model) return null

  if (STRICT_TENANT_MODELS.has(model)) {
    return { practiceId: context.practiceId }
  }

  // The practice itself: a scoped client may only ever see its own.
  if (model === 'Practice') {
    return { id: context.practiceId }
  }

  // Scales have three ownership tiers and a nullable practiceId, so visibility
  // is a union rather than an equality: this practice's scales, the global
  // library, and the current clinician's personal scales.
  if (model === 'Scale') {
    return {
      OR: [
        { practiceId: context.practiceId },
        { practiceId: null, isLibrary: true },
        { practiceId: null, psychologistId: context.userId },
      ],
    }
  }

  // Notifications are practice-scoped except account-level ones (LOGIN), which
  // belong to the human and must surface whichever practice is active.
  if (model === 'Notification') {
    return {
      OR: [{ practiceId: context.practiceId }, { practiceId: null }],
    }
  }

  return null
}

/**
 * Combine the caller's filter with the tenant predicate.
 *
 * Spreading keeps `findUnique` valid, which requires its unique field at the
 * top level of `where`.
 *
 * When the caller already uses one of the predicate's keys — asking for a
 * specific Practice by id, say — the predicate goes into `AND` *alongside* the
 * caller's keys rather than replacing them or wrapping the whole clause. Both
 * conditions then apply, so a request for another tenant's row matches nothing
 * instead of being silently redirected to the caller's own.
 *
 * Wrapping as `{ AND: [caller, predicate] }` would be wrong: it moves the
 * unique field out of the top level and Prisma rejects the query.
 */
function mergeWhere(
  existing: unknown,
  predicate: WhereObject,
): WhereObject {
  if (!existing || typeof existing !== 'object') return predicate

  const current = existing as WhereObject
  const collides = Object.keys(predicate).some((key) => key in current)
  if (!collides) return { ...current, ...predicate }

  const existingAnd = current.AND
  const and = Array.isArray(existingAnd)
    ? existingAnd
    : existingAnd
      ? [existingAnd]
      : []

  return { ...current, AND: [...and, predicate] }
}

/**
 * Stamp the practice onto rows being created.
 *
 * An explicit `practiceId` in the payload is respected even when null — that is
 * how an account-level notification is written. Only an absent key is filled in.
 */
function withTenant(
  data: unknown,
  model: string | undefined,
  context: PracticeContext,
): unknown {
  if (!data || typeof data !== 'object') return data
  if (!model) return data
  if (!STRICT_TENANT_MODELS.has(model) && model !== 'Scale') return data

  const row = data as Record<string, unknown>
  if ('practiceId' in row || 'practice' in row) return row

  return { ...row, practiceId: context.practiceId }
}

/**
 * Data access for one request, locked to one practice.
 *
 * The context argument is required and there is deliberately no no-argument
 * overload: needing a practice is the point.
 */
export function scopedDb(context: PracticeContext) {
  return prisma.$extends({
    name: 'practice-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const predicate = tenantPredicate(model, context)
          if (!predicate) return query(args)

          const next = { ...(args as Record<string, unknown>) }

          if (
            READ_OPERATIONS.has(operation) ||
            FILTERED_WRITE_OPERATIONS.has(operation)
          ) {
            next.where = mergeWhere(next.where, predicate)
          }

          if (operation === 'create') {
            next.data = withTenant(next.data, model, context)
          }

          if (operation === 'createMany') {
            const rows = next.data
            next.data = Array.isArray(rows)
              ? rows.map((row) => withTenant(row, model, context))
              : withTenant(rows, model, context)
          }

          // upsert filters on `where` (handled above) but its create payload
          // still needs stamping.
          if (operation === 'upsert') {
            next.create = withTenant(next.create, model, context)
          }

          return query(next)
        },
      },
    },
  })
}

export type ScopedDb = ReturnType<typeof scopedDb>

/**
 * A Prisma-like client, scoped or not.
 *
 * Shared helpers in `lib/` take this rather than reaching for the module-level
 * client, so a caller that holds a practice-scoped client keeps its tenant
 * filter all the way down. Route handlers pass `scopedDb(ctx)`; the few
 * genuinely tenant-free callers pass `unscopedDb` explicitly, which makes that
 * choice visible in review.
 */
export type PrismaLike = ScopedDb | typeof prisma

/**
 * Escape hatch for genuinely tenant-free work: authentication, signup, email
 * verification, password reset, and the patient fill-by-token flow — which is
 * authenticated by a single-use token that already identifies exactly one
 * session, and has no practice context to scope by.
 *
 * Every use is a place the tenancy boundary does not apply. Adding one should
 * be a deliberate, reviewed decision, not a way around a missing context.
 */
export const unscopedDb = prisma
