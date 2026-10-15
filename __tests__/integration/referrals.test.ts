/**
 * Referral state machine against a real database when available.
 */
import { PrismaClient } from "@prisma/client"
import {
  acceptReferral,
  createReferral,
  declineReferral,
} from "@/lib/referrals"

const hasDatabase = Boolean(process.env.DATABASE_URL)
const describeDb = hasDatabase ? describe : describe.skip

jest.setTimeout(60_000)

const PREFIX = "__reftest__"
const TAG = `${PREFIX}${process.pid}_`

describeDb("referrals", () => {
  const prisma = new PrismaClient()
  let practiceId: string
  let patientId: string
  let sourceAreaId: string
  let targetAreaId: string
  let referrerId: string
  let receiverId: string

  async function purge() {
    await prisma.practice.deleteMany({ where: { slug: { startsWith: TAG } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: TAG } } })
  }

  beforeAll(async () => {
    await purge()

    const referrer = await prisma.user.create({
      data: { email: `${TAG}-from@example.test`, name: "From" },
    })
    const receiver = await prisma.user.create({
      data: { email: `${TAG}-to@example.test`, name: "To" },
    })
    referrerId = referrer.id
    receiverId = receiver.id

    const practice = await prisma.practice.create({
      data: {
        name: `${TAG} Clinic`,
        slug: `${TAG}-clinic`,
        status: "ACTIVE",
        patientAccess: "OPEN",
      },
    })
    practiceId = practice.id

    await prisma.membership.createMany({
      data: [
        {
          userId: referrerId,
          practiceId,
          role: "CLINICIAN",
          status: "ACTIVE",
        },
        {
          userId: receiverId,
          practiceId,
          role: "CLINICIAN",
          status: "ACTIVE",
        },
      ],
    })

    const source = await prisma.area.create({
      data: { practiceId, name: `${TAG} Source`, specialty: "CLINICAL" },
    })
    const target = await prisma.area.create({
      data: { practiceId, name: `${TAG} Target`, specialty: "FORENSIC" },
    })
    sourceAreaId = source.id
    targetAreaId = target.id

    const patient = await prisma.patient.create({
      data: {
        practiceId,
        psychologistId: referrerId,
        anonymousId: `${TAG}-p1`,
        displayName: "R. Patient",
        areas: { create: { areaId: sourceAreaId } },
      },
    })
    patientId = patient.id
  })

  afterAll(async () => {
    await purge()
    await prisma.$disconnect()
  })

  it("accepting adds the target area and puts the receiver on the care team", async () => {
    const created = await createReferral({
      practiceId,
      actorId: referrerId,
      patientId,
      reason: "Needs forensic assessment",
      sourceAreaId,
      targetAreaId,
      targetUserId: receiverId,
      send: true,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const accepted = await acceptReferral({
      practiceId,
      actorId: receiverId,
      referralId: created.referralId,
    })
    expect(accepted.ok).toBe(true)

    const areas = await prisma.patientArea.findMany({
      where: { patientId },
    })
    expect(areas.map((a) => a.areaId).sort()).toEqual(
      [sourceAreaId, targetAreaId].sort(),
    )

    const care = await prisma.careTeamMember.findUnique({
      where: {
        patientId_userId: { patientId, userId: receiverId },
      },
    })
    expect(care).not.toBeNull()
  })

  it("lets the directed clinician decline", async () => {
    const created = await createReferral({
      practiceId,
      actorId: referrerId,
      patientId,
      reason: "Second opinion",
      targetUserId: receiverId,
      send: true,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const declined = await declineReferral({
      practiceId,
      actorId: receiverId,
      referralId: created.referralId,
    })
    expect(declined.ok).toBe(true)

    const row = await prisma.referral.findUnique({
      where: { id: created.referralId },
    })
    expect(row?.status).toBe("DECLINED")
  })
})
