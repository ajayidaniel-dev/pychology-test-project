import type { Prisma, PrismaClient } from '@prisma/client'
import { generateToken, tokenExpiresAt } from '@/lib/token'

type Db = PrismaClient | Prisma.TransactionClient

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
