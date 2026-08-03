import type { ClinicalSession, Prisma } from '@prisma/client'
import { generateToken, tokenExpiresAt } from '@/lib/token'

/**
 * Just the two delegates this helper touches.
 *
 * Structural rather than nominal on purpose: a practice-scoped client from
 * `lib/db` is a Prisma *extension*, so it is not assignable to `PrismaClient`
 * or `Prisma.TransactionClient` even though it behaves like one. Naming only
 * what is used lets a plain client, a transaction client, and a scoped client
 * all satisfy it — and a caller holding a scoped client keeps its tenant filter
 * through this helper.
 */
type Db = {
  clinicalSession: {
    update(args: Prisma.ClinicalSessionUpdateArgs): Promise<ClinicalSession>
  }
  questionnaire: {
    updateMany(
      args: Prisma.QuestionnaireUpdateManyArgs,
    ): Promise<Prisma.BatchPayload>
  }
}

/**
 * Mints a fresh token for a session and revives the questionnaires the old
 * token's expiry knocked out.
 *
 * The revival half is easy to forget: expiry flips PENDING questionnaires to
 * EXPIRED, so a renewed link would otherwise hand the patient a session with
 * nothing left to answer. Single-session renew and batch renew both go through
 * here so they cannot drift apart.
 */
export async function renewSessionLink(db: Db, sessionId: string) {
  const updated = await db.clinicalSession.update({
    where: { id: sessionId },
    data: { token: generateToken(), tokenExpiresAt: tokenExpiresAt() },
  })

  await db.questionnaire.updateMany({
    where: { sessionId, status: 'EXPIRED' },
    data: { status: 'PENDING' },
  })

  return updated
}
