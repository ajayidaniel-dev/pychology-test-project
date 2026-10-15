// lib/areas.ts
//
// Area CRUD and membership/patient assignment inside a practice.
// Areas are rooms, not walls — organisational only.

import type { Specialty } from '@prisma/client'
import { unscopedDb, type PrismaLike } from '@/lib/db'
import { writeAuditEntry } from '@/lib/audit'

export type AreaRow = {
  id: string
  name: string
  specialty: Specialty | null
  description: string | null
  createdAt: Date
  memberCount: number
  patientCount: number
}

export async function listAreas(
  db: PrismaLike,
  practiceId: string,
): Promise<AreaRow[]> {
  const areas = await db.area.findMany({
    where: { practiceId },
    select: {
      id: true,
      name: true,
      specialty: true,
      description: true,
      createdAt: true,
      memberships: { select: { membershipId: true } },
      patients: { select: { patientId: true } },
    },
    orderBy: { name: 'asc' },
  })

  return areas.map((a) => ({
    id: a.id,
    name: a.name,
    specialty: a.specialty,
    description: a.description,
    createdAt: a.createdAt,
    memberCount: a.memberships.length,
    patientCount: a.patients.length,
  }))
}

export type AreaMutationResult =
  | { ok: true; areaId: string }
  | { ok: false; error: string; status: number }

export async function createArea(input: {
  practiceId: string
  actorId: string
  name: string
  specialty?: Specialty | null
  description?: string | null
}): Promise<AreaMutationResult> {
  const name = input.name.trim()
  if (!name) {
    return { ok: false, error: 'Name is required.', status: 400 }
  }

  const existing = await unscopedDb.area.findUnique({
    where: {
      practiceId_name: { practiceId: input.practiceId, name },
    },
    select: { id: true },
  })
  if (existing) {
    return { ok: false, error: 'An area with that name already exists.', status: 409 }
  }

  const area = await unscopedDb.area.create({
    data: {
      practiceId: input.practiceId,
      name,
      specialty: input.specialty ?? null,
      description: input.description?.trim() || null,
    },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'area.created',
    subjectType: 'Area',
    subjectId: area.id,
    metadata: { name, specialty: area.specialty },
  })

  return { ok: true, areaId: area.id }
}

export async function updateArea(input: {
  practiceId: string
  actorId: string
  areaId: string
  name?: string
  specialty?: Specialty | null
  description?: string | null
}): Promise<AreaMutationResult> {
  const area = await unscopedDb.area.findFirst({
    where: { id: input.areaId, practiceId: input.practiceId },
  })
  if (!area) {
    return { ok: false, error: 'Area not found.', status: 404 }
  }

  const name = input.name?.trim()
  if (name && name !== area.name) {
    const clash = await unscopedDb.area.findUnique({
      where: {
        practiceId_name: { practiceId: input.practiceId, name },
      },
      select: { id: true },
    })
    if (clash) {
      return { ok: false, error: 'An area with that name already exists.', status: 409 }
    }
  }

  await unscopedDb.area.update({
    where: { id: area.id },
    data: {
      ...(name ? { name } : {}),
      ...(input.specialty !== undefined ? { specialty: input.specialty } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
    },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'area.updated',
    subjectType: 'Area',
    subjectId: area.id,
  })

  return { ok: true, areaId: area.id }
}

export async function deleteArea(input: {
  practiceId: string
  actorId: string
  areaId: string
}): Promise<AreaMutationResult> {
  const area = await unscopedDb.area.findFirst({
    where: { id: input.areaId, practiceId: input.practiceId },
    select: {
      id: true,
      name: true,
      patients: { select: { patientId: true }, take: 1 },
    },
  })
  if (!area) {
    return { ok: false, error: 'Area not found.', status: 404 }
  }
  if (area.patients.length > 0) {
    return {
      ok: false,
      error: 'Move or remove patients from this area before deleting it.',
      status: 409,
    }
  }

  await unscopedDb.area.delete({ where: { id: area.id } })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'area.deleted',
    subjectType: 'Area',
    subjectId: area.id,
    metadata: { name: area.name },
  })

  return { ok: true, areaId: area.id }
}

/** Replace a membership's area set. */
export async function setMembershipAreas(input: {
  practiceId: string
  actorId: string
  membershipId: string
  areaIds: string[]
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const membership = await unscopedDb.membership.findFirst({
    where: {
      id: input.membershipId,
      practiceId: input.practiceId,
      status: 'ACTIVE',
    },
  })
  if (!membership) {
    return { ok: false, error: 'Member not found.', status: 404 }
  }

  const areas = await unscopedDb.area.findMany({
    where: { practiceId: input.practiceId, id: { in: input.areaIds } },
    select: { id: true },
  })
  if (areas.length !== input.areaIds.length) {
    return { ok: false, error: 'One or more areas were not found.', status: 400 }
  }

  await unscopedDb.$transaction([
    unscopedDb.membershipArea.deleteMany({
      where: { membershipId: membership.id },
    }),
    unscopedDb.membershipArea.createMany({
      data: areas.map((a) => ({
        membershipId: membership.id,
        areaId: a.id,
      })),
    }),
  ])

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'membership.areas_set',
    subjectType: 'Membership',
    subjectId: membership.id,
    metadata: { areaIds: areas.map((a) => a.id) },
  })

  return { ok: true }
}

/** Replace a patient's area set. */
export async function setPatientAreas(input: {
  practiceId: string
  actorId: string
  patientId: string
  areaIds: string[]
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const patient = await unscopedDb.patient.findFirst({
    where: { id: input.patientId, practiceId: input.practiceId },
    select: { id: true },
  })
  if (!patient) {
    return { ok: false, error: 'Patient not found.', status: 404 }
  }

  const areas = await unscopedDb.area.findMany({
    where: { practiceId: input.practiceId, id: { in: input.areaIds } },
    select: { id: true },
  })
  if (areas.length !== input.areaIds.length) {
    return { ok: false, error: 'One or more areas were not found.', status: 400 }
  }

  await unscopedDb.$transaction([
    unscopedDb.patientArea.deleteMany({ where: { patientId: patient.id } }),
    unscopedDb.patientArea.createMany({
      data: areas.map((a) => ({
        patientId: patient.id,
        areaId: a.id,
      })),
    }),
  ])

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'patient.areas_set',
    subjectType: 'Patient',
    subjectId: patient.id,
    metadata: { areaIds: areas.map((a) => a.id) },
  })

  return { ok: true }
}
