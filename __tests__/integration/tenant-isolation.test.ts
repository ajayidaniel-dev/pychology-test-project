/**
 * Cross-tenant leak suite.
 *
 * The single most important test file in a multi-tenant app: it is what lets
 * the data layer be refactored later without fear. Every assertion here is a
 * claim that one practice cannot see or touch another's rows.
 *
 * This talks to a real database (scoping is enforced by generated SQL, so
 * mocking Prisma would test nothing). It skips when DATABASE_URL is absent so
 * unit-test runs and CI without a database stay green.
 */
import { PrismaClient, type Practice, type Patient, type Membership } from "@prisma/client"
import { scopedDb } from "@/lib/db"
import type { PracticeContext } from "@/lib/session-context"

const hasDatabase = Boolean(process.env.DATABASE_URL)
const describeDb = hasDatabase ? describe : describe.skip

// Every assertion is a network round-trip to a hosted Postgres; Jest's 5s
// default is a latency measurement, not a correctness one.
jest.setTimeout(60_000)

const PREFIX = "__leaktest__"

/**
 * Fixtures are namespaced per run, not just per suite.
 *
 * With a fixed tag, two overlapping jest invocations purge each other's rows
 * mid-test — which surfaces as foreign-key violations on rows this suite
 * created moments earlier, not as anything resembling a tenancy bug. The run id
 * keeps concurrent runs independent.
 */
const TAG = `${PREFIX}${process.pid}_`

/** Rows from runs that died before their teardown. */
const STALE_MS = 60 * 60 * 1000

describeDb("cross-tenant isolation", () => {
  const prisma = new PrismaClient()

  let practiceA: Practice
  let practiceB: Practice
  let patientA: Patient
  let patientB: Patient
  let membershipA: Membership
  let contextA: PracticeContext

  /** Remove this run's fixtures. */
  async function purge() {
    await prisma.practice.deleteMany({ where: { slug: { startsWith: TAG } } })
    await prisma.scale.deleteMany({ where: { name: { startsWith: TAG } } })
    await prisma.notification.deleteMany({
      where: { dedupeKey: { startsWith: TAG } },
    })
    await prisma.user.deleteMany({ where: { email: { startsWith: TAG } } })
  }

  /**
   * Sweep fixtures abandoned by runs that were killed before teardown. Scoped
   * by age so a *concurrent* run's rows are never touched.
   */
  async function purgeStale() {
    const before = new Date(Date.now() - STALE_MS)
    await prisma.practice.deleteMany({
      where: { slug: { startsWith: PREFIX }, createdAt: { lt: before } },
    })
    await prisma.scale.deleteMany({
      where: { name: { startsWith: PREFIX }, createdAt: { lt: before } },
    })
    await prisma.notification.deleteMany({
      where: { dedupeKey: { startsWith: PREFIX }, createdAt: { lt: before } },
    })
  }

  beforeAll(async () => {
    // Sweep abandoned fixtures first: a run killed part-way through would
    // otherwise leave rows behind forever. Only rows older than STALE_MS, so a
    // concurrently running suite is left alone.
    await purgeStale()

    const clinician = await prisma.user.create({
      data: { email: `${TAG}-clinician@example.test`, name: "Leak Test" },
    })

    practiceA = await prisma.practice.create({
      data: { name: `${TAG} A`, slug: `${TAG}-a`, status: "ACTIVE" },
    })
    practiceB = await prisma.practice.create({
      data: { name: `${TAG} B`, slug: `${TAG}-b`, status: "ACTIVE" },
    })

    membershipA = await prisma.membership.create({
      data: {
        userId: clinician.id,
        practiceId: practiceA.id,
        role: "CLINICIAN",
        status: "ACTIVE",
      },
    })

    // The same human also works at practice B. That is the whole point: their
    // membership there must not leak into their practice-A context.
    await prisma.membership.create({
      data: {
        userId: clinician.id,
        practiceId: practiceB.id,
        role: "CLINICIAN",
        status: "ACTIVE",
      },
    })

    patientA = await prisma.patient.create({
      data: {
        practiceId: practiceA.id,
        psychologistId: clinician.id,
        displayName: "Patient A",
        anonymousId: "P-801",
      },
    })
    patientB = await prisma.patient.create({
      data: {
        practiceId: practiceB.id,
        psychologistId: clinician.id,
        displayName: "Patient B",
        anonymousId: "P-802",
      },
    })

    contextA = {
      userId: clinician.id,
      email: clinician.email,
      name: clinician.name,
      practiceId: practiceA.id,
      practiceSlug: practiceA.slug,
      practiceName: practiceA.name,
      practiceStatus: practiceA.status,
      membershipId: membershipA.id,
      role: "CLINICIAN",
    }
  })

  afterAll(async () => {
    // Practices cascade to patients, sessions, memberships and notes.
    await purge()
    await prisma.$disconnect()
  })

  describe("reads", () => {
    it("findMany returns only the active practice's patients", async () => {
      const patients = await scopedDb(contextA).patient.findMany()

      expect(patients.map((p) => p.id)).toContain(patientA.id)
      expect(patients.map((p) => p.id)).not.toContain(patientB.id)
    })

    it("findUnique on another practice's row returns null", async () => {
      const found = await scopedDb(contextA).patient.findUnique({
        where: { id: patientB.id },
      })

      expect(found).toBeNull()
    })

    it("findFirst cannot be steered onto another practice by filter", async () => {
      // A caller filtering by the other practice's own identifiers still gets
      // nothing — the predicate is added, not replaced.
      const found = await scopedDb(contextA).patient.findFirst({
        where: { anonymousId: "P-802" },
      })

      expect(found).toBeNull()
    })

    it("count is practice-scoped", async () => {
      const [scoped, total] = await Promise.all([
        scopedDb(contextA).patient.count(),
        prisma.patient.count(),
      ])

      expect(scoped).toBeLessThan(total)
      expect(scoped).toBe(1)
    })

    it("a practice cannot read another practice record", async () => {
      const other = await scopedDb(contextA).practice.findUnique({
        where: { id: practiceB.id },
      })

      expect(other).toBeNull()
    })

    it("memberships in other practices are invisible", async () => {
      const memberships = await scopedDb(contextA).membership.findMany()

      expect(memberships).toHaveLength(1)
      expect(memberships[0].practiceId).toBe(practiceA.id)
    })
  })

  describe("writes", () => {
    it("create stamps the practice without being asked", async () => {
      const created = await scopedDb(contextA).patient.create({
        data: {
          displayName: "Implicitly Scoped",
          anonymousId: "P-803",
          psychologistId: contextA.userId,
        } as never,
      })

      expect(created.practiceId).toBe(practiceA.id)
      await prisma.patient.delete({ where: { id: created.id } })
    })

    it("update on another practice's row is rejected", async () => {
      await expect(
        scopedDb(contextA).patient.update({
          where: { id: patientB.id },
          data: { displayName: "HIJACKED" },
        }),
      ).rejects.toThrow()

      const untouched = await prisma.patient.findUniqueOrThrow({
        where: { id: patientB.id },
      })
      expect(untouched.displayName).toBe("Patient B")
    })

    it("delete on another practice's row is rejected", async () => {
      await expect(
        scopedDb(contextA).patient.delete({ where: { id: patientB.id } }),
      ).rejects.toThrow()

      expect(
        await prisma.patient.findUnique({ where: { id: patientB.id } }),
      ).not.toBeNull()
    })

    it("updateMany cannot reach beyond the practice", async () => {
      const result = await scopedDb(contextA).patient.updateMany({
        data: { detailsUpdatedAt: new Date() },
      })

      expect(result.count).toBe(1)

      const other = await prisma.patient.findUniqueOrThrow({
        where: { id: patientB.id },
      })
      expect(other.detailsUpdatedAt).toBeNull()
    })

    it("deleteMany cannot reach beyond the practice", async () => {
      const doomed = await prisma.patient.create({
        data: {
          practiceId: practiceA.id,
          psychologistId: contextA.userId,
          displayName: "Doomed",
          anonymousId: "P-804",
        },
      })

      const result = await scopedDb(contextA).patient.deleteMany({
        where: { id: { in: [doomed.id, patientB.id] } },
      })

      expect(result.count).toBe(1)
      expect(
        await prisma.patient.findUnique({ where: { id: patientB.id } }),
      ).not.toBeNull()
    })
  })

  describe("transactions", () => {
    it("scoping holds inside $transaction", async () => {
      // An unscoped transaction client would be a silent hole straight through
      // the boundary, since the batch-create paths all run in one.
      const seen = await scopedDb(contextA).$transaction(async (tx) => {
        return tx.patient.findMany()
      })

      expect(seen.map((p) => p.id)).not.toContain(patientB.id)
    })
  })

  describe("scales — three ownership tiers", () => {
    it("shows the global library and hides another practice's scales", async () => {
      const [library, foreign] = await Promise.all([
        prisma.scale.create({
          data: { name: `${TAG} Library`, isLibrary: true },
        }),
        prisma.scale.create({
          data: { name: `${TAG} Foreign`, practiceId: practiceB.id },
        }),
      ])

      const visible = await scopedDb(contextA).scale.findMany()
      const ids = visible.map((s) => s.id)

      expect(ids).toContain(library.id)
      expect(ids).not.toContain(foreign.id)
    })

    it("shows the clinician's own personal scales", async () => {
      const personal = await prisma.scale.create({
        data: { name: `${TAG} Personal`, psychologistId: contextA.userId },
      })

      const visible = await scopedDb(contextA).scale.findMany()

      expect(visible.map((s) => s.id)).toContain(personal.id)
    })
  })

  describe("notifications", () => {
    it("keeps account-level notifications visible but hides other practices'", async () => {
      const [accountLevel, foreign] = await Promise.all([
        prisma.notification.create({
          data: {
            userId: contextA.userId,
            type: "LOGIN",
            title: "Signed in",
            body: "Account level",
            dedupeKey: `${TAG}-login`,
          },
        }),
        prisma.notification.create({
          data: {
            userId: contextA.userId,
            practiceId: practiceB.id,
            type: "QUESTIONNAIRE_COMPLETED",
            title: "Other practice",
            body: "Should be hidden",
            dedupeKey: `${TAG}-foreign`,
          },
        }),
      ])

      const visible = await scopedDb(contextA).notification.findMany({
        where: { userId: contextA.userId },
      })
      const ids = visible.map((n) => n.id)

      expect(ids).toContain(accountLevel.id)
      expect(ids).not.toContain(foreign.id)
    })
  })
})
