// lib/referrals.ts
//
// Internal referral workflow. Not a data-sharing grant — on accept we add the
// target area and put the receiver on the care team. See design §8.

import type { ReferralPriority, ReferralStatus } from '@prisma/client'
import { unscopedDb, type PrismaLike } from '@/lib/db'
import { writeAuditEntry } from '@/lib/audit'
import { addCareTeamMember } from '@/lib/care-teams'

const ACTIVE_INBOX: ReferralStatus[] = ['SENT', 'ACCEPTED', 'IN_PROGRESS']
const HISTORY_INBOX: ReferralStatus[] = ['COMPLETED', 'DECLINED']

export type ReferralRow = {
  id: string
  status: ReferralStatus
  priority: ReferralPriority
  reason: string
  summary: string | null
  createdAt: Date
  sentAt: Date | null
  patient: {
    id: string
    displayName: string
    anonymousId: string
  }
  sourceArea: { id: string; name: string } | null
  targetArea: { id: string; name: string } | null
  targetUser: { id: string; name: string | null; email: string | null } | null
  createdBy: { id: string; name: string | null; email: string | null }
  acceptedBy: { id: string; name: string | null; email: string | null } | null
}

const referralSelect = {
  id: true,
  status: true,
  priority: true,
  reason: true,
  summary: true,
  createdAt: true,
  sentAt: true,
  patient: {
    select: { id: true, displayName: true, anonymousId: true },
  },
  sourceArea: { select: { id: true, name: true } },
  targetArea: { select: { id: true, name: true } },
  targetUser: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  acceptedBy: { select: { id: true, name: true, email: true } },
} as const

async function inboxTargetWhere(
  db: PrismaLike,
  ctx: { userId: string; membershipId: string },
) {
  const membership = await db.membership.findFirst({
    where: { id: ctx.membershipId },
    select: { areas: { select: { areaId: true } } },
  })
  const areaIds = membership?.areas.map((a) => a.areaId) ?? []

  return [
    { targetUserId: ctx.userId },
    ...(areaIds.length > 0
      ? [{ targetAreaId: { in: areaIds }, targetUserId: null }]
      : []),
  ]
}

export async function listInbox(
  db: PrismaLike,
  ctx: { practiceId: string; userId: string; membershipId: string },
): Promise<ReferralRow[]> {
  const targetOr = await inboxTargetWhere(db, ctx)

  return db.referral.findMany({
    where: {
      status: { in: ACTIVE_INBOX },
      OR: targetOr,
    },
    select: referralSelect,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })
}

/** Completed / declined referrals that were directed at this user (inbox archive). */
export async function listHistory(
  db: PrismaLike,
  ctx: { practiceId: string; userId: string; membershipId: string },
): Promise<ReferralRow[]> {
  const targetOr = await inboxTargetWhere(db, ctx)

  return db.referral.findMany({
    where: {
      status: { in: HISTORY_INBOX },
      OR: targetOr,
    },
    select: referralSelect,
    orderBy: { createdAt: 'desc' },
  })
}

export async function listOutbox(
  db: PrismaLike,
  userId: string,
): Promise<ReferralRow[]> {
  return db.referral.findMany({
    where: { createdById: userId },
    select: referralSelect,
    orderBy: { createdAt: 'desc' },
  })
}

export type CreateReferralInput = {
  practiceId: string
  actorId: string
  patientId: string
  reason: string
  priority?: ReferralPriority
  sourceAreaId?: string | null
  targetAreaId?: string | null
  targetUserId?: string | null
  /** When true, create already SENT. */
  send?: boolean
}

export async function createReferral(
  input: CreateReferralInput,
): Promise<
  | { ok: true; referralId: string }
  | { ok: false; error: string; status: number }
> {
  const reason = input.reason.trim()
  if (!reason) {
    return { ok: false, error: 'Reason is required.', status: 400 }
  }
  if (!input.targetAreaId && !input.targetUserId) {
    return {
      ok: false,
      error: 'Choose a target area or a receiving clinician.',
      status: 400,
    }
  }

  const patient = await unscopedDb.patient.findFirst({
    where: { id: input.patientId, practiceId: input.practiceId },
    select: { id: true },
  })
  if (!patient) {
    return { ok: false, error: 'Patient not found.', status: 404 }
  }

  if (input.targetAreaId) {
    const area = await unscopedDb.area.findFirst({
      where: { id: input.targetAreaId, practiceId: input.practiceId },
    })
    if (!area) {
      return { ok: false, error: 'Target area not found.', status: 400 }
    }
  }
  if (input.sourceAreaId) {
    const area = await unscopedDb.area.findFirst({
      where: { id: input.sourceAreaId, practiceId: input.practiceId },
    })
    if (!area) {
      return { ok: false, error: 'Source area not found.', status: 400 }
    }
  }
  if (input.targetUserId) {
    const membership = await unscopedDb.membership.findFirst({
      where: {
        userId: input.targetUserId,
        practiceId: input.practiceId,
        status: 'ACTIVE',
      },
    })
    if (!membership) {
      return { ok: false, error: 'Receiving clinician not found.', status: 400 }
    }
  }

  const send = Boolean(input.send)
  const referral = await unscopedDb.referral.create({
    data: {
      practiceId: input.practiceId,
      patientId: input.patientId,
      reason,
      priority: input.priority ?? 'ROUTINE',
      sourceAreaId: input.sourceAreaId ?? null,
      targetAreaId: input.targetAreaId ?? null,
      targetUserId: input.targetUserId ?? null,
      createdById: input.actorId,
      status: send ? 'SENT' : 'DRAFTED',
      sentAt: send ? new Date() : null,
    },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: send ? 'referral.sent' : 'referral.drafted',
    subjectType: 'Referral',
    subjectId: referral.id,
    metadata: { patientId: input.patientId },
  })

  return { ok: true, referralId: referral.id }
}

export async function sendReferral(input: {
  practiceId: string
  actorId: string
  referralId: string
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const referral = await unscopedDb.referral.findFirst({
    where: { id: input.referralId, practiceId: input.practiceId },
  })
  if (!referral) {
    return { ok: false, error: 'Referral not found.', status: 404 }
  }
  if (referral.createdById !== input.actorId) {
    return { ok: false, error: 'Only the author can send this referral.', status: 403 }
  }
  if (referral.status !== 'DRAFTED') {
    return { ok: false, error: 'Only drafts can be sent.', status: 409 }
  }

  await unscopedDb.referral.update({
    where: { id: referral.id },
    data: { status: 'SENT', sentAt: new Date() },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'referral.sent',
    subjectType: 'Referral',
    subjectId: referral.id,
  })

  return { ok: true }
}

export async function acceptReferral(input: {
  practiceId: string
  actorId: string
  referralId: string
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const referral = await unscopedDb.referral.findFirst({
    where: { id: input.referralId, practiceId: input.practiceId },
  })
  if (!referral) {
    return { ok: false, error: 'Referral not found.', status: 404 }
  }
  if (referral.status !== 'SENT') {
    return { ok: false, error: 'Only sent referrals can be accepted.', status: 409 }
  }

  if (
    referral.targetUserId &&
    referral.targetUserId !== input.actorId
  ) {
    return {
      ok: false,
      error: 'This referral was directed to someone else.',
      status: 403,
    }
  }

  await unscopedDb.referral.update({
    where: { id: referral.id },
    data: {
      status: 'ACCEPTED',
      acceptedById: input.actorId,
      resolvedAt: new Date(),
    },
  })

  // Side effects: target area on patient + receiver on care team.
  if (referral.targetAreaId) {
    await unscopedDb.patientArea.upsert({
      where: {
        patientId_areaId: {
          patientId: referral.patientId,
          areaId: referral.targetAreaId,
        },
      },
      create: {
        patientId: referral.patientId,
        areaId: referral.targetAreaId,
      },
      update: {},
    })
  }

  // Responsible clinician is already on the record — treat that as success.
  const care = await addCareTeamMember({
    practiceId: input.practiceId,
    actorId: input.actorId,
    patientId: referral.patientId,
    userId: input.actorId,
  })
  if (!care.ok && care.status !== 409) {
    return care
  }

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'referral.accepted',
    subjectType: 'Referral',
    subjectId: referral.id,
  })

  return { ok: true }
}

export async function declineReferral(input: {
  practiceId: string
  actorId: string
  referralId: string
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const referral = await unscopedDb.referral.findFirst({
    where: { id: input.referralId, practiceId: input.practiceId },
  })
  if (!referral) {
    return { ok: false, error: 'Referral not found.', status: 404 }
  }
  if (referral.status !== 'SENT') {
    return { ok: false, error: 'Only sent referrals can be declined.', status: 409 }
  }
  if (referral.targetUserId && referral.targetUserId !== input.actorId) {
    return {
      ok: false,
      error: 'This referral was directed to someone else.',
      status: 403,
    }
  }

  await unscopedDb.referral.update({
    where: { id: referral.id },
    data: {
      status: 'DECLINED',
      acceptedById: input.actorId,
      resolvedAt: new Date(),
    },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'referral.declined',
    subjectType: 'Referral',
    subjectId: referral.id,
  })

  return { ok: true }
}

export async function startReferral(input: {
  practiceId: string
  actorId: string
  referralId: string
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const referral = await unscopedDb.referral.findFirst({
    where: { id: input.referralId, practiceId: input.practiceId },
  })
  if (!referral) {
    return { ok: false, error: 'Referral not found.', status: 404 }
  }
  if (referral.status !== 'ACCEPTED') {
    return { ok: false, error: 'Only accepted referrals can be started.', status: 409 }
  }
  if (referral.acceptedById !== input.actorId) {
    return { ok: false, error: 'Only the acceptor can start work.', status: 403 }
  }

  await unscopedDb.referral.update({
    where: { id: referral.id },
    data: { status: 'IN_PROGRESS' },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'referral.started',
    subjectType: 'Referral',
    subjectId: referral.id,
  })

  return { ok: true }
}

export async function completeReferral(input: {
  practiceId: string
  actorId: string
  referralId: string
  summary: string
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const summary = input.summary.trim()
  if (!summary) {
    return { ok: false, error: 'A completion summary is required.', status: 400 }
  }

  const referral = await unscopedDb.referral.findFirst({
    where: { id: input.referralId, practiceId: input.practiceId },
  })
  if (!referral) {
    return { ok: false, error: 'Referral not found.', status: 404 }
  }
  if (referral.status !== 'IN_PROGRESS' && referral.status !== 'ACCEPTED') {
    return {
      ok: false,
      error: 'Only accepted or in-progress referrals can be completed.',
      status: 409,
    }
  }
  if (referral.acceptedById !== input.actorId) {
    return { ok: false, error: 'Only the acceptor can complete this referral.', status: 403 }
  }

  await unscopedDb.referral.update({
    where: { id: referral.id },
    data: {
      status: 'COMPLETED',
      summary,
      completedAt: new Date(),
    },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.actorId,
    action: 'referral.completed',
    subjectType: 'Referral',
    subjectId: referral.id,
  })

  return { ok: true }
}
