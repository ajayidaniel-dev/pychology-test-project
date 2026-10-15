// lib/team.ts
//
// Membership mutations inside a practice: role changes and offboarding.
//
// Offboarding never deletes the row. Access ends (status → DEPARTED); authorship
// and the audit trail stay intact. Patients still pointing at the departing
// clinician as responsible must be reassigned first — leaving them unassigned
// is how caseloads quietly go dark.

import type { MembershipRole, MembershipStatus } from '@prisma/client'
import { unscopedDb, type PrismaLike } from '@/lib/db'
import { writeAuditEntry } from '@/lib/audit'
import { isAssignableRole } from '@/lib/roles'

export type MemberRow = {
  id: string
  role: MembershipRole
  status: MembershipStatus
  joinedAt: Date
  leftAt: Date | null
  licenceNumber: string | null
  user: {
    id: string
    name: string | null
    email: string | null
  }
  patientCount: number
}

export async function listMembers(
  db: PrismaLike,
  practiceId: string,
): Promise<MemberRow[]> {
  const members = await db.membership.findMany({
    where: { practiceId },
    select: {
      id: true,
      role: true,
      status: true,
      joinedAt: true,
      leftAt: true,
      licenceNumber: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ status: 'asc' }, { joinedAt: 'asc' }],
  })

  const activeUserIds = members
    .filter((m) => m.status === 'ACTIVE')
    .map((m) => m.user.id)

  // Count per clinician with findMany + reduce rather than groupBy: PrismaLike
  // is a union of the extended client and the base client, and groupBy's
  // overload set does not unify cleanly across that union.
  const patients =
    activeUserIds.length === 0
      ? []
      : await db.patient.findMany({
          where: { practiceId, psychologistId: { in: activeUserIds } },
          select: { psychologistId: true },
        })

  const countByUser = new Map<string, number>()
  for (const p of patients) {
    countByUser.set(p.psychologistId, (countByUser.get(p.psychologistId) ?? 0) + 1)
  }

  return members.map((m) => ({
    id: m.id,
    role: m.role,
    status: m.status,
    joinedAt: m.joinedAt,
    leftAt: m.leftAt,
    licenceNumber: m.licenceNumber,
    user: m.user,
    patientCount: countByUser.get(m.user.id) ?? 0,
  }))
}

export type RoleChangeResult =
  | { ok: true }
  | { ok: false; error: string; status: number }

export async function changeMemberRole(input: {
  practiceId: string
  actorId: string
  actorRole: MembershipRole
  membershipId: string
  nextRole: MembershipRole
}): Promise<RoleChangeResult> {
  if (!isAssignableRole(input.nextRole) && input.nextRole !== 'OWNER') {
    return { ok: false, error: 'Invalid role.', status: 400 }
  }

  // Ownership is not transferable through the role dropdown — that is a
  // deliberate, audited action of its own (not built yet).
  if (input.nextRole === 'OWNER') {
    return {
      ok: false,
      error: 'Ownership cannot be assigned this way.',
      status: 400,
    }
  }

  const membership = await unscopedDb.membership.findFirst({
    where: { id: input.membershipId, practiceId: input.practiceId },
  })
  if (!membership || membership.status !== 'ACTIVE') {
    return { ok: false, error: 'Member not found.', status: 404 }
  }

  if (membership.role === 'OWNER') {
    return {
      ok: false,
      error: 'The owner’s role cannot be changed here.',
      status: 403,
    }
  }

  // Admins manage staff but cannot touch another admin’s role — only owners do.
  if (
    input.actorRole === 'ADMIN' &&
    (membership.role === 'ADMIN' || input.nextRole === 'ADMIN')
  ) {
    return {
      ok: false,
      error: 'Only an owner can change admin roles.',
      status: 403,
    }
  }

  if (membership.role === input.nextRole) {
    return { ok: true }
  }

  await unscopedDb.membership.update({
    where: { id: membership.id },
    data: { role: input.nextRole },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'membership.role_changed',
    subjectType: 'Membership',
    subjectId: membership.id,
    metadata: { from: membership.role, to: input.nextRole },
  })

  return { ok: true }
}

export type OffboardResult =
  | { ok: true }
  | { ok: false; error: string; status: number; patientCount?: number }

/**
 * Move a membership to DEPARTED. Blocked when the member is still the
 * responsible clinician for any patient in the practice.
 */
export async function offboardMember(input: {
  practiceId: string
  actorId: string
  actorRole: MembershipRole
  membershipId: string
}): Promise<OffboardResult> {
  const membership = await unscopedDb.membership.findFirst({
    where: { id: input.membershipId, practiceId: input.practiceId },
    include: { user: { select: { id: true, email: true } } },
  })
  if (!membership || membership.status !== 'ACTIVE') {
    return { ok: false, error: 'Member not found.', status: 404 }
  }

  if (membership.role === 'OWNER') {
    const ownerCount = await unscopedDb.membership.count({
      where: {
        practiceId: input.practiceId,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    })
    if (ownerCount <= 1) {
      return {
        ok: false,
        error: 'The practice needs at least one owner.',
        status: 409,
      }
    }
  }

  if (input.actorRole === 'ADMIN' && membership.role === 'OWNER') {
    return {
      ok: false,
      error: 'An admin cannot remove the owner.',
      status: 403,
    }
  }

  if (input.actorRole === 'ADMIN' && membership.role === 'ADMIN') {
    return {
      ok: false,
      error: 'Only an owner can remove an admin.',
      status: 403,
    }
  }

  const patientCount = await unscopedDb.patient.count({
    where: {
      practiceId: input.practiceId,
      psychologistId: membership.userId,
    },
  })
  if (patientCount > 0) {
    return {
      ok: false,
      error: `Reassign ${patientCount} patient${patientCount === 1 ? '' : 's'} before removing this member.`,
      status: 409,
      patientCount,
    }
  }

  await unscopedDb.membership.update({
    where: { id: membership.id },
    data: { status: 'DEPARTED', leftAt: new Date() },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'membership.offboarded',
    subjectType: 'Membership',
    subjectId: membership.id,
    metadata: {
      userId: membership.userId,
      email: membership.user.email,
      role: membership.role,
    },
  })

  return { ok: true }
}
