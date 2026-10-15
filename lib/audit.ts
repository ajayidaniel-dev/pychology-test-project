// lib/audit.ts
//
// Append-only record of who did what, to whom, in which practice.
//
// Written for membership changes and anything that crosses a boundary. Not
// optional in healthcare — it is specifically what makes offboarding and any
// future cross-practice disclosure defensible.

import type { Prisma } from '@prisma/client'
import type { PrismaLike } from '@/lib/db'

export type AuditInput = {
  practiceId: string
  actorId: string | null
  action: string
  subjectType: string
  subjectId: string
  metadata?: Prisma.InputJsonValue
}

export async function writeAuditEntry(
  db: PrismaLike,
  entry: AuditInput,
): Promise<void> {
  await db.auditEntry.create({
    data: {
      practiceId: entry.practiceId,
      actorId: entry.actorId,
      action: entry.action,
      subjectType: entry.subjectType,
      subjectId: entry.subjectId,
      metadata: entry.metadata ?? undefined,
    },
  })
}
