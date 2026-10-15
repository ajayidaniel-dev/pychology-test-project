// lib/patient-access.ts
//
// The patient access ladder — how far a membership can see into the practice
// caseload. The practice is still the wall; this only decides rooms.
//
//   OPEN           — anyone with managePatients sees every patient (default)
//   AREA_SCOPED    — patients in your areas, plus your caseload, plus care team
//   ASSIGNED_ONLY  — responsible clinician or care-team member
//
// Owner and Admin always see the full practice caseload: they manage the
// practice, including reassignment and offboarding. See design §6.

import type { PatientAccessMode, Prisma } from '@prisma/client'
import type { PrismaLike } from '@/lib/db'
import type { PracticeContext } from '@/lib/session-context'
import { can } from '@/lib/roles'

export const PATIENT_ACCESS_LABELS: Record<PatientAccessMode, string> = {
  OPEN: 'Open',
  AREA_SCOPED: 'Area-scoped',
  ASSIGNED_ONLY: 'Assigned only',
}

export const PATIENT_ACCESS_DESCRIPTIONS: Record<PatientAccessMode, string> = {
  OPEN: 'Any team member who works with patients can see the full caseload. Right for small clinics.',
  AREA_SCOPED:
    'You see patients in areas you belong to, patients you are responsible for, and patients whose care team you are on.',
  ASSIGNED_ONLY:
    'You see only patients you are responsible for, or whose care team you have been added to.',
}

/**
 * Prisma `where` for Patient queries this actor may see.
 *
 * ScopedDb already constrains practiceId — this only adds the ladder.
 */
export async function patientVisibilityWhere(
  db: PrismaLike,
  ctx: PracticeContext,
): Promise<Prisma.PatientWhereInput> {
  // Practice managers see everyone inside the wall.
  if (ctx.role === 'OWNER' || ctx.role === 'ADMIN') {
    return {}
  }

  if (!can(ctx.role, 'managePatients')) {
    // No patient capability — match nothing (empty `in` never matches).
    return { id: { in: [] } }
  }

  const practice = await db.practice.findFirst({
    where: { id: ctx.practiceId },
    select: { patientAccess: true },
  })
  const mode = practice?.patientAccess ?? 'OPEN'

  if (mode === 'OPEN') {
    return {}
  }

  const assignedOrTeam: Prisma.PatientWhereInput = {
    OR: [
      { psychologistId: ctx.userId },
      { careTeam: { some: { userId: ctx.userId } } },
    ],
  }

  if (mode === 'ASSIGNED_ONLY') {
    return assignedOrTeam
  }

  // AREA_SCOPED
  const membership = await db.membership.findFirst({
    where: { id: ctx.membershipId },
    select: { areas: { select: { areaId: true } } },
  })
  const areaIds = membership?.areas.map((a) => a.areaId) ?? []

  return {
    OR: [
      { psychologistId: ctx.userId },
      { careTeam: { some: { userId: ctx.userId } } },
      ...(areaIds.length > 0
        ? [{ areas: { some: { areaId: { in: areaIds } } } }]
        : []),
    ],
  }
}

/**
 * Load a patient only if the ladder permits.
 *
 * Args are passed through to Prisma. Typed loosely because PrismaLike is a
 * union of the base and extended clients, and generics do not unify across it.
 */
export async function findAccessiblePatient(
  db: PrismaLike,
  ctx: PracticeContext,
  patientId: string,
  args: {
    select?: Prisma.PatientSelect
    include?: Prisma.PatientInclude
  } = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const visibility = await patientVisibilityWhere(db, ctx)
  return db.patient.findFirst({
    ...args,
    where: { id: patientId, AND: [visibility] },
  })
}

/**
 * Where clause for ClinicalSession rows that hang off an accessible patient.
 * Prefer this over filtering sessions by psychologistId alone.
 */
export async function sessionPatientVisibilityWhere(
  db: PrismaLike,
  ctx: PracticeContext,
): Promise<Prisma.ClinicalSessionWhereInput> {
  const visibility = await patientVisibilityWhere(db, ctx)
  // Empty visibility means whole practice (already scoped).
  if (Object.keys(visibility).length === 0) {
    return {}
  }
  return { patient: visibility }
}
