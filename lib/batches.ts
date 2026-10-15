import type { PrismaLike } from '@/lib/db'
import { isTokenExpired } from '@/lib/token'

/** Guardrail on one transaction's size, and on how many links a clinician can sanely hand out at once. */
export const MAX_BATCH_PATIENTS = 100

/**
 * Everything the batch pages read. Kept here so the list page, the detail page
 * and the CSV export cannot disagree about what a batch contains.
 */
export const BATCH_SESSIONS_INCLUDE = {
  sessions: {
    include: {
      patient: { select: { id: true, anonymousId: true, displayName: true } },
      questionnaires: {
        include: { scale: { select: { name: true } } },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { patient: { anonymousId: 'asc' } },
  },
} as const

export interface BatchProgress {
  patientCount: number
  completedCount: number
  expiredLinkCount: number
}

type SessionLike = {
  tokenExpiresAt: Date
  questionnaires: { status: string }[]
}

/**
 * A patient counts as done when every questionnaire on their session is
 * answered — a half-finished session is not a return.
 */
export function batchProgress(sessions: SessionLike[]): BatchProgress {
  return {
    patientCount: sessions.length,
    completedCount: sessions.filter(
      (s) =>
        s.questionnaires.length > 0 &&
        s.questionnaires.every((q) => q.status === 'COMPLETED'),
    ).length,
    expiredLinkCount: sessions.filter(
      (s) =>
        isTokenExpired(s.tokenExpiresAt) &&
        s.questionnaires.some((q) => q.status !== 'COMPLETED'),
    ).length,
  }
}

/** Loads a batch, scoped to its owner. Returns null when it isn't theirs. */
export async function findOwnedBatch(
  db: PrismaLike,
  batchId: string,
  psychologistId: string,
) {
  return db.sessionBatch.findFirst({
    where: { id: batchId, psychologistId },
    include: BATCH_SESSIONS_INCLUDE,
  })
}
