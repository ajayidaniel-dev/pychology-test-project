// lib/invitations.ts
//
// Practice invitations: create, accept, decline, revoke, expire.
//
// The accept flow splits on whether the email already has an account. An
// existing user accepts in one click and gains a second membership — never a
// second account. That path is what makes multi-practice real.
//
// See docs/multi-tenancy-design.md §4.

import { randomUUID } from 'node:crypto'
import type {
  InvitationStatus,
  MembershipRole,
  PracticeInvitation,
} from '@prisma/client'
import { NotificationType } from '@prisma/client'
import { unscopedDb } from '@/lib/db'
import { writeAuditEntry } from '@/lib/audit'
import { sendEmail } from '@/lib/mailer'
import { createNotification } from '@/lib/notifications'
import { isAssignableRole, ROLE_LABELS } from '@/lib/roles'
import { practicePath } from '@/lib/practice-path'

/** Seven days — long enough to catch someone mid-week, short enough to rotate. */
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function mintInviteToken(): string {
  return randomUUID()
}

export function invitationExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + INVITATION_TTL_MS)
}

export function invitationUrl(token: string, origin: string): string {
  return `${origin.replace(/\/$/, '')}/invitations/${token}`
}

/**
 * Mark PENDING invitations past their expiry. Called opportunistically from
 * list/accept paths so we do not need a cron for correctness.
 */
export async function expireStaleInvitations(
  practiceId?: string,
): Promise<number> {
  const result = await unscopedDb.practiceInvitation.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
      ...(practiceId ? { practiceId } : {}),
    },
    data: { status: 'EXPIRED' },
  })
  return result.count
}

export type CreateInvitationInput = {
  practiceId: string
  practiceName: string
  practiceSlug: string
  practiceStatus: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED'
  email: string
  role: MembershipRole
  /** Areas applied as MembershipArea rows on accept. */
  areaIds?: string[]
  invitedById: string
  origin: string
}

export type CreateInvitationResult =
  | { ok: true; invitation: PracticeInvitation; existingUser: boolean }
  | { ok: false; error: string; status: number }

export async function createInvitation(
  input: CreateInvitationInput,
): Promise<CreateInvitationResult> {
  if (input.practiceStatus !== 'ACTIVE') {
    return {
      ok: false,
      error:
        'This practice cannot invite staff until it is verified.',
      status: 403,
    }
  }

  if (!isAssignableRole(input.role)) {
    return {
      ok: false,
      error: 'That role cannot be assigned by invitation.',
      status: 400,
    }
  }

  const email = normalizeInviteEmail(input.email)
  if (!email.includes('@')) {
    return { ok: false, error: 'Enter a valid email address.', status: 400 }
  }

  await expireStaleInvitations(input.practiceId)

  const existingUser = await unscopedDb.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  })

  if (existingUser) {
    const membership = await unscopedDb.membership.findUnique({
      where: {
        userId_practiceId: {
          userId: existingUser.id,
          practiceId: input.practiceId,
        },
      },
      select: { status: true },
    })
    if (membership?.status === 'ACTIVE' || membership?.status === 'SUSPENDED') {
      return {
        ok: false,
        error: 'That person is already a member of this practice.',
        status: 409,
      }
    }
  }

  const pending = await unscopedDb.practiceInvitation.findFirst({
    where: {
      practiceId: input.practiceId,
      email,
      status: 'PENDING',
    },
    select: { id: true },
  })
  if (pending) {
    return {
      ok: false,
      error: 'An invitation is already pending for that email.',
      status: 409,
    }
  }

  const areaIds = Array.from(new Set(input.areaIds ?? []))
  if (areaIds.length > 0) {
    const areas = await unscopedDb.area.findMany({
      where: { practiceId: input.practiceId, id: { in: areaIds } },
      select: { id: true },
    })
    if (areas.length !== areaIds.length) {
      return {
        ok: false,
        error: 'One or more areas were not found.',
        status: 400,
      }
    }
  }

  const token = mintInviteToken()
  const invitation = await unscopedDb.practiceInvitation.create({
    data: {
      practiceId: input.practiceId,
      email,
      role: input.role,
      areaIds,
      token,
      invitedById: input.invitedById,
      expiresAt: invitationExpiresAt(),
      status: 'PENDING',
    },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: input.practiceId,
    actorId: input.invitedById,
    action: 'invitation.created',
    subjectType: 'PracticeInvitation',
    subjectId: invitation.id,
    metadata: { email, role: input.role, areaIds },
  })

  const url = invitationUrl(token, input.origin)
  const roleLabel = ROLE_LABELS[input.role]

  await sendEmail({
    to: email,
    subject: `Join ${input.practiceName} on APAS`,
    text: [
      `You have been invited to join ${input.practiceName} as ${roleLabel}.`,
      '',
      `Accept the invitation: ${url}`,
      '',
      'This link expires in 7 days.',
      existingUser
        ? 'You already have an APAS account — sign in and accept in one click. Do not create a second account.'
        : 'If you do not yet have an APAS account, create one with this email address, then open the link again.',
    ].join('\n'),
  })

  if (existingUser) {
    // In-app notice for the person who already uses APAS. The href is the
    // token URL, not a practice-prefixed path — they may have no membership
    // in this practice yet, which is the whole point.
    await createNotification({
      userId: existingUser.id,
      practiceId: input.practiceId,
      type: NotificationType.PRACTICE_INVITATION,
      title: `Invitation to ${input.practiceName}`,
      body: `You have been invited to join as ${roleLabel}.`,
      dedupeKey: `invitation:${invitation.id}`,
      href: `/invitations/${token}`,
    })
  }

  return { ok: true, invitation, existingUser: Boolean(existingUser) }
}

export type InvitationPeek = {
  id: string
  email: string
  role: MembershipRole
  status: InvitationStatus
  expiresAt: Date
  practiceName: string
  practiceSlug: string
}

export async function peekInvitation(
  token: string,
): Promise<InvitationPeek | null> {
  await expireStaleInvitations()

  const invitation = await unscopedDb.practiceInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      practice: { select: { name: true, slug: true } },
    },
  })
  if (!invitation) return null

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    practiceName: invitation.practice.name,
    practiceSlug: invitation.practice.slug,
  }
}

export type AcceptResult =
  | {
      ok: true
      practiceSlug: string
      practiceName: string
      membershipId: string
      created: boolean
    }
  | { ok: false; error: string; status: number }

/**
 * Accept an invitation for the signed-in user.
 *
 * Email must match (case-insensitive). Existing ACTIVE membership is a no-op
 * success. DEPARTED membership is reactivated — the unique constraint means
 * we never create a second row for the same human in the same practice.
 */
export async function acceptInvitation(
  token: string,
  user: { userId: string; email: string | null },
): Promise<AcceptResult> {
  if (!user.email) {
    return {
      ok: false,
      error: 'Your account needs an email address to accept invitations.',
      status: 400,
    }
  }

  await expireStaleInvitations()

  const invitation = await unscopedDb.practiceInvitation.findUnique({
    where: { token },
    include: { practice: { select: { id: true, name: true, slug: true, status: true } } },
  })

  if (!invitation) {
    return { ok: false, error: 'Invitation not found.', status: 404 }
  }

  if (invitation.status === 'EXPIRED' || invitation.expiresAt < new Date()) {
    if (invitation.status === 'PENDING') {
      await unscopedDb.practiceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })
    }
    return { ok: false, error: 'This invitation has expired.', status: 410 }
  }

  if (invitation.status === 'REVOKED') {
    return { ok: false, error: 'This invitation was revoked.', status: 410 }
  }

  if (invitation.status === 'DECLINED') {
    return { ok: false, error: 'This invitation was declined.', status: 410 }
  }

  if (invitation.status === 'ACCEPTED') {
    // Idempotent: if they already accepted, send them to the practice.
    const existing = await unscopedDb.membership.findFirst({
      where: {
        userId: user.userId,
        practiceId: invitation.practiceId,
        status: 'ACTIVE',
      },
      select: { id: true },
    })
    if (existing) {
      return {
        ok: true,
        practiceSlug: invitation.practice.slug,
        practiceName: invitation.practice.name,
        membershipId: existing.id,
        created: false,
      }
    }
    return { ok: false, error: 'This invitation has already been used.', status: 410 }
  }

  if (normalizeInviteEmail(user.email) !== invitation.email) {
    return {
      ok: false,
      error: `This invitation was sent to ${invitation.email}. Sign in with that address to accept it.`,
      status: 403,
    }
  }

  if (invitation.practice.status !== 'ACTIVE') {
    return {
      ok: false,
      error: 'This practice is not accepting new members right now.',
      status: 403,
    }
  }

  const existing = await unscopedDb.membership.findUnique({
    where: {
      userId_practiceId: {
        userId: user.userId,
        practiceId: invitation.practiceId,
      },
    },
  })

  let membershipId: string
  let created: boolean

  if (existing?.status === 'ACTIVE') {
    membershipId = existing.id
    created = false
  } else if (existing) {
    const updated = await unscopedDb.membership.update({
      where: { id: existing.id },
      data: {
        status: 'ACTIVE',
        role: invitation.role,
        leftAt: null,
        joinedAt: new Date(),
      },
    })
    membershipId = updated.id
    created = false
  } else {
    const createdMembership = await unscopedDb.membership.create({
      data: {
        userId: user.userId,
        practiceId: invitation.practiceId,
        role: invitation.role,
        status: 'ACTIVE',
      },
    })
    membershipId = createdMembership.id
    created = true
  }

  if (invitation.areaIds.length > 0) {
    const validAreas = await unscopedDb.area.findMany({
      where: {
        practiceId: invitation.practiceId,
        id: { in: invitation.areaIds },
      },
      select: { id: true },
    })
    if (validAreas.length > 0) {
      await unscopedDb.membershipArea.createMany({
        data: validAreas.map((a) => ({
          membershipId,
          areaId: a.id,
        })),
        skipDuplicates: true,
      })
    }
  }

  await unscopedDb.practiceInvitation.update({
    where: { id: invitation.id },
    data: { status: 'ACCEPTED', acceptedAt: new Date() },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: invitation.practiceId,
    actorId: user.userId,
    action: 'invitation.accepted',
    subjectType: 'Membership',
    subjectId: membershipId,
    metadata: {
      invitationId: invitation.id,
      role: invitation.role,
      areaIds: invitation.areaIds,
      reactivated: Boolean(existing && existing.status !== 'ACTIVE'),
    },
  })

  return {
    ok: true,
    practiceSlug: invitation.practice.slug,
    practiceName: invitation.practice.name,
    membershipId,
    created,
  }
}

export async function declineInvitation(
  token: string,
  user: { userId: string; email: string | null },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!user.email) {
    return { ok: false, error: 'Your account needs an email address.', status: 400 }
  }

  await expireStaleInvitations()

  const invitation = await unscopedDb.practiceInvitation.findUnique({
    where: { token },
  })
  if (!invitation) {
    return { ok: false, error: 'Invitation not found.', status: 404 }
  }
  if (invitation.status !== 'PENDING') {
    return { ok: false, error: 'This invitation is no longer pending.', status: 409 }
  }
  if (normalizeInviteEmail(user.email) !== invitation.email) {
    return { ok: false, error: 'This invitation was sent to a different address.', status: 403 }
  }

  await unscopedDb.practiceInvitation.update({
    where: { id: invitation.id },
    data: { status: 'DECLINED' },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: invitation.practiceId,
    actorId: user.userId,
    action: 'invitation.declined',
    subjectType: 'PracticeInvitation',
    subjectId: invitation.id,
  })

  return { ok: true }
}

export async function revokeInvitation(
  invitationId: string,
  actor: { userId: string; practiceId: string },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const invitation = await unscopedDb.practiceInvitation.findFirst({
    where: { id: invitationId, practiceId: actor.practiceId },
  })
  if (!invitation) {
    return { ok: false, error: 'Invitation not found.', status: 404 }
  }
  if (invitation.status !== 'PENDING') {
    return { ok: false, error: 'Only pending invitations can be revoked.', status: 409 }
  }

  await unscopedDb.practiceInvitation.update({
    where: { id: invitation.id },
    data: { status: 'REVOKED' },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: actor.practiceId,
    actorId: actor.userId,
    action: 'invitation.revoked',
    subjectType: 'PracticeInvitation',
    subjectId: invitation.id,
    metadata: { email: invitation.email },
  })

  return { ok: true }
}

/** Pending invitations addressed to this email — for /no-practice and the shell. */
export async function listPendingInvitationsForEmail(email: string | null) {
  if (!email) return []
  await expireStaleInvitations()
  return unscopedDb.practiceInvitation.findMany({
    where: {
      email: normalizeInviteEmail(email),
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      token: true,
      role: true,
      expiresAt: true,
      practice: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/** Post-accept landing path inside the practice. */
export function invitationAcceptedPath(practiceSlug: string): string {
  return practicePath(practiceSlug, '/dashboard')
}
