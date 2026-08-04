/**
 * Phase 6: invitations, existing-user accept, offboarding guard.
 *
 * Speaks to a real database — membership uniqueness and patient-reassignment
 * checks are SQL constraints, not TypeScript ones. Skips without DATABASE_URL.
 */
import { PrismaClient } from "@prisma/client"
import {
  acceptInvitation,
  createInvitation,
  declineInvitation,
  revokeInvitation,
} from "@/lib/invitations"
import { changeMemberRole, offboardMember } from "@/lib/team"

const hasDatabase = Boolean(process.env.DATABASE_URL)
const describeDb = hasDatabase ? describe : describe.skip

jest.setTimeout(60_000)

const PREFIX = "__teamtest__"
const TAG = `${PREFIX}${process.pid}_`

describeDb("team invitations and offboarding", () => {
  const prisma = new PrismaClient()

  let practiceId: string
  let ownerId: string
  let existingUserId: string
  let inviteToken: string
  let inviteId: string

  async function purge() {
    await prisma.practice.deleteMany({ where: { slug: { startsWith: TAG } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: TAG } } })
  }

  beforeAll(async () => {
    await purge()

    const owner = await prisma.user.create({
      data: {
        email: `${TAG}-owner@example.test`,
        name: "Team Owner",
      },
    })
    ownerId = owner.id

    const existing = await prisma.user.create({
      data: {
        email: `${TAG}-existing@example.test`,
        name: "Existing Clinician",
      },
    })
    existingUserId = existing.id

    // Existing user already has a home practice — accepting must add a second
    // membership, not a second account.
    const home = await prisma.practice.create({
      data: { name: `${TAG} Home`, slug: `${TAG}-home`, status: "ACTIVE" },
    })
    await prisma.membership.create({
      data: {
        userId: existingUserId,
        practiceId: home.id,
        role: "OWNER",
        status: "ACTIVE",
      },
    })

    const practice = await prisma.practice.create({
      data: {
        name: `${TAG} Clinic`,
        slug: `${TAG}-clinic`,
        status: "ACTIVE",
      },
    })
    practiceId = practice.id

    await prisma.membership.create({
      data: {
        userId: ownerId,
        practiceId,
        role: "OWNER",
        status: "ACTIVE",
      },
    })
  })

  afterAll(async () => {
    await purge()
    await prisma.$disconnect()
  })

  it("invites an existing user and accepts in one click without a second account", async () => {
    const created = await createInvitation({
      practiceId,
      practiceName: `${TAG} Clinic`,
      practiceSlug: `${TAG}-clinic`,
      practiceStatus: "ACTIVE",
      email: `${TAG}-existing@example.test`,
      role: "CLINICIAN",
      invitedById: ownerId,
      origin: "http://localhost:3000",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    expect(created.existingUser).toBe(true)
    inviteToken = created.invitation.token
    inviteId = created.invitation.id

    const notification = await prisma.notification.findFirst({
      where: {
        userId: existingUserId,
        type: "PRACTICE_INVITATION",
        dedupeKey: `invitation:${inviteId}`,
      },
    })
    expect(notification).not.toBeNull()

    const usersBefore = await prisma.user.count({
      where: { email: `${TAG}-existing@example.test` },
    })
    expect(usersBefore).toBe(1)

    const accepted = await acceptInvitation(inviteToken, {
      userId: existingUserId,
      email: `${TAG}-existing@example.test`,
    })
    expect(accepted.ok).toBe(true)
    if (!accepted.ok) return

    expect(accepted.practiceSlug).toBe(`${TAG}-clinic`)

    const memberships = await prisma.membership.findMany({
      where: { userId: existingUserId, status: "ACTIVE" },
    })
    expect(memberships).toHaveLength(2)
    expect(memberships.map((m) => m.role).sort()).toEqual([
      "CLINICIAN",
      "OWNER",
    ])

    const usersAfter = await prisma.user.count({
      where: { email: `${TAG}-existing@example.test` },
    })
    expect(usersAfter).toBe(1)
  })

  it("blocks offboarding while the member still owns patients", async () => {
    const clinician = await prisma.user.create({
      data: { email: `${TAG}-caseload@example.test`, name: "Has Patients" },
    })
    const membership = await prisma.membership.create({
      data: {
        userId: clinician.id,
        practiceId,
        role: "CLINICIAN",
        status: "ACTIVE",
      },
    })
    await prisma.patient.create({
      data: {
        practiceId,
        psychologistId: clinician.id,
        anonymousId: `${TAG}-p1`,
        displayName: "P. One",
      },
    })

    const blocked = await offboardMember({
      practiceId,
      actorId: ownerId,
      actorRole: "OWNER",
      membershipId: membership.id,
    })
    expect(blocked.ok).toBe(false)
    if (blocked.ok) return
    expect(blocked.status).toBe(409)
    expect(blocked.patientCount).toBe(1)

    await prisma.patient.deleteMany({ where: { practiceId, psychologistId: clinician.id } })

    const allowed = await offboardMember({
      practiceId,
      actorId: ownerId,
      actorRole: "OWNER",
      membershipId: membership.id,
    })
    expect(allowed.ok).toBe(true)

    const departed = await prisma.membership.findUnique({
      where: { id: membership.id },
    })
    expect(departed?.status).toBe("DEPARTED")
    expect(departed?.leftAt).not.toBeNull()
  })

  it("revokes a pending invitation and refuses a later accept", async () => {
    const created = await createInvitation({
      practiceId,
      practiceName: `${TAG} Clinic`,
      practiceSlug: `${TAG}-clinic`,
      practiceStatus: "ACTIVE",
      email: `${TAG}-revoke@example.test`,
      role: "FRONT_DESK",
      invitedById: ownerId,
      origin: "http://localhost:3000",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const revoked = await revokeInvitation(created.invitation.id, {
      userId: ownerId,
      practiceId,
    })
    expect(revoked.ok).toBe(true)

    const newbie = await prisma.user.create({
      data: {
        email: `${TAG}-revoke@example.test`,
        name: "Too Late",
      },
    })

    const accepted = await acceptInvitation(created.invitation.token, {
      userId: newbie.id,
      email: `${TAG}-revoke@example.test`,
    })
    expect(accepted.ok).toBe(false)
    if (accepted.ok) return
    expect(accepted.status).toBe(410)
  })

  it("lets an invitee decline", async () => {
    const created = await createInvitation({
      practiceId,
      practiceName: `${TAG} Clinic`,
      practiceSlug: `${TAG}-clinic`,
      practiceStatus: "ACTIVE",
      email: `${TAG}-decline@example.test`,
      role: "ADMIN",
      invitedById: ownerId,
      origin: "http://localhost:3000",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const user = await prisma.user.create({
      data: {
        email: `${TAG}-decline@example.test`,
        name: "Decliner",
      },
    })

    const declined = await declineInvitation(created.invitation.token, {
      userId: user.id,
      email: `${TAG}-decline@example.test`,
    })
    expect(declined.ok).toBe(true)

    const row = await prisma.practiceInvitation.findUnique({
      where: { id: created.invitation.id },
    })
    expect(row?.status).toBe("DECLINED")
  })

  it("refuses to promote someone to Owner via role change", async () => {
    const member = await prisma.membership.findFirst({
      where: {
        practiceId,
        userId: existingUserId,
        status: "ACTIVE",
      },
    })
    expect(member).not.toBeNull()

    const result = await changeMemberRole({
      practiceId,
      actorId: ownerId,
      actorRole: "OWNER",
      membershipId: member!.id,
      nextRole: "OWNER",
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
  })
})
