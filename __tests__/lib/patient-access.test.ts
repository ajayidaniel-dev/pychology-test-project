import type { PracticeContext } from "@/lib/session-context"
import { patientVisibilityWhere } from "@/lib/patient-access"

function ctx(
  overrides: Partial<PracticeContext> = {},
): PracticeContext {
  return {
    userId: "user-1",
    email: "u@test",
    name: "U",
    practiceId: "p-1",
    practiceSlug: "p",
    practiceName: "P",
    practiceStatus: "ACTIVE",
    membershipId: "m-1",
    role: "CLINICIAN",
    ...overrides,
  }
}

describe("patientVisibilityWhere", () => {
  it("lets Owner and Admin see the whole practice caseload", async () => {
    const db = {
      practice: { findFirst: jest.fn() },
      membership: { findFirst: jest.fn() },
    }

    await expect(
      patientVisibilityWhere(db as never, ctx({ role: "OWNER" })),
    ).resolves.toEqual({})
    await expect(
      patientVisibilityWhere(db as never, ctx({ role: "ADMIN" })),
    ).resolves.toEqual({})
    expect(db.practice.findFirst).not.toHaveBeenCalled()
  })

  it("returns an open filter for OPEN mode", async () => {
    const db = {
      practice: {
        findFirst: jest.fn().mockResolvedValue({ patientAccess: "OPEN" }),
      },
      membership: { findFirst: jest.fn() },
    }

    await expect(
      patientVisibilityWhere(db as never, ctx()),
    ).resolves.toEqual({})
  })

  it("scopes assigned-only to responsible clinician or care team", async () => {
    const db = {
      practice: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ patientAccess: "ASSIGNED_ONLY" }),
      },
      membership: { findFirst: jest.fn() },
    }

    await expect(
      patientVisibilityWhere(db as never, ctx({ userId: "clin-1" })),
    ).resolves.toEqual({
      OR: [
        { psychologistId: "clin-1" },
        { careTeam: { some: { userId: "clin-1" } } },
      ],
    })
  })

  it("includes overlapping areas for AREA_SCOPED", async () => {
    const db = {
      practice: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ patientAccess: "AREA_SCOPED" }),
      },
      membership: {
        findFirst: jest.fn().mockResolvedValue({
          areas: [{ areaId: "a1" }, { areaId: "a2" }],
        }),
      },
    }

    const where = await patientVisibilityWhere(
      db as never,
      ctx({ userId: "clin-1", membershipId: "m-9" }),
    )

    expect(where).toEqual({
      OR: [
        { psychologistId: "clin-1" },
        { careTeam: { some: { userId: "clin-1" } } },
        { areas: { some: { areaId: { in: ["a1", "a2"] } } } },
      ],
    })
  })
})
