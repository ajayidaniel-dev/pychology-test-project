// lib/care-teams.ts
//
// Named clinicians on a patient. Intra-practice sharing — not a consent grant.

import { unscopedDb, type PrismaLike } from '@/lib/db'
import { writeAuditEntry } from '@/lib/audit'

export type CareTeamRow = {
  id: string
  userId: string
  addedAt: Date
  user: { id: string; name: string | null; email: string | null }
}

export async function listCareTeam(
  db: PrismaLike,
  patientId: string,
): Promise<CareTeamRow[]> {
  const rows = await db.careTeamMember.findMany({
    where: { patientId },
    select: {
      id: true,
      userId: true,
      addedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { addedAt: 'asc' },
  })
  return rows
}

export async function addCareTeamMember(input: {
  practiceId: string
  actorId: string
  patientId: string
  userId: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string; status: number }> {
  const patient = await unscopedDb.patient.findFirst({
    where: { id: input.patientId, practiceId: input.practiceId },
    select: { id: true, psychologistId: true },
  })
  if (!patient) {
    return { ok: false, error: 'Patient not found.', status: 404 }
  }
  if (patient.psychologistId === input.userId) {
    return {
      ok: false,
      error: 'The responsible clinician is already on the record.',
      status: 409,
    }
  }

  const membership = await unscopedDb.membership.findFirst({
    where: {
      userId: input.userId,
      practiceId: input.practiceId,
      status: 'ACTIVE',
    },
    select: { id: true },
  })
  if (!membership) {
    return {
      ok: false,
      error: 'That person is not an active member of this practice.',
      status: 400,
    }
  }

  const existing = await unscopedDb.careTeamMember.findUnique({
    where: {
      patientId_userId: {
        patientId: input.patientId,
        userId: input.userId,
      },
    },
  })
  if (existing) {
    return { ok: true, id: existing.id }
  }

  const row = await unscopedDb.careTeamMember.create({
    data: {
      practiceId: input.practiceId,
      patientId: input.patientId,
      userId: input.userId,
      addedById: input.actorId,
    },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'patient.care_team_added',
    subjectType: 'Patient',
    subjectId: input.patientId,
    metadata: { userId: input.userId },
  })

  return { ok: true, id: row.id }
}

export async function removeCareTeamMember(input: {
  practiceId: string
  actorId: string
  patientId: string
  userId: string
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const row = await unscopedDb.careTeamMember.findFirst({
    where: {
      patientId: input.patientId,
      userId: input.userId,
      practiceId: input.practiceId,
    },
  })
  if (!row) {
    return { ok: false, error: 'Care team member not found.', status: 404 }
  }

  await unscopedDb.careTeamMember.delete({ where: { id: row.id } })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'patient.care_team_removed',
    subjectType: 'Patient',
    subjectId: input.patientId,
    metadata: { userId: input.userId },
  })

  return { ok: true }
}
