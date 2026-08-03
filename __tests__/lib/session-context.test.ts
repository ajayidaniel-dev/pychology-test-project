jest.mock("next-auth", () => ({
  __esModule: true,
  getServerSession: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  __esModule: true,
  redirect: jest.fn(() => {
    // next/navigation's redirect throws to halt rendering; mimic that so tests
    // catch any caller that carries on as though it returned.
    throw new Error("NEXT_REDIRECT")
  }),
}))

jest.mock("@/lib/auth", () => ({
  __esModule: true,
  authOptions: {},
}))

const requestHeaders = new Map<string, string>()
let requestCookie: string | undefined

jest.mock("next/headers", () => ({
  __esModule: true,
  headers: () => requestHeaders,
  cookies: () => ({
    get: (name: string) =>
      name === "apas_practice" && requestCookie
        ? { name, value: requestCookie }
        : undefined,
  }),
}))

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: { membership: { findFirst: jest.fn() } },
}))

import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import {
  getPracticeContext,
  getUserContext,
  noPractice,
  practiceContextFailure,
  requirePracticeContext,
  requireUser,
  unauthorized,
} from "@/lib/session-context"

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>
const mockFindFirst = (prisma as unknown as {
  membership: { findFirst: jest.Mock }
}).membership.findFirst

const signedIn = () =>
  mockGetServerSession.mockResolvedValue({
    user: { id: "u1", email: "clinician@example.com", name: "Ada" },
  })

describe("session context", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requestHeaders.clear()
    requestCookie = undefined
  })

  describe("getUserContext", () => {
    it("returns the user when the session carries an id", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "u1", email: "clinician@example.com", name: "Ada" },
      })

      await expect(getUserContext()).resolves.toEqual({
        userId: "u1",
        email: "clinician@example.com",
        name: "Ada",
      })
    })

    it("returns null when signed out", async () => {
      mockGetServerSession.mockResolvedValue(null)

      await expect(getUserContext()).resolves.toBeNull()
    })

    it("returns null when a session exists but carries no user id", async () => {
      // A malformed session must not be treated as authenticated — this is the
      // case that would otherwise reach a query with `undefined` as the owner.
      mockGetServerSession.mockResolvedValue({ user: {} })

      await expect(getUserContext()).resolves.toBeNull()
    })

    it("normalises missing email and name to null rather than undefined", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: "u1" } })

      await expect(getUserContext()).resolves.toEqual({
        userId: "u1",
        email: null,
        name: null,
      })
    })
  })

  describe("requireUser", () => {
    it("returns the user when signed in and does not redirect", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "u1", email: "clinician@example.com", name: "Ada" },
      })

      await expect(requireUser()).resolves.toMatchObject({ userId: "u1" })
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("redirects to sign-in when signed out", async () => {
      mockGetServerSession.mockResolvedValue(null)

      await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT")
      expect(mockRedirect).toHaveBeenCalledWith("/auth/signin")
    })
  })

  describe("unauthorized", () => {
    it("is a 401 with a stable body shape", async () => {
      const response = unauthorized()

      expect(response.status).toBe(401)
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
    })
  })

  describe("getPracticeContext", () => {
    it("returns the user's practice, membership and role", async () => {
      signedIn()
      mockFindFirst.mockResolvedValue({
        id: "m1",
        practiceId: "p1",
        role: "CLINICIAN",
        practice: { slug: "renaissance", name: "Renaissance" },
      })

      await expect(getPracticeContext()).resolves.toEqual({
        userId: "u1",
        email: "clinician@example.com",
        name: "Ada",
        practiceId: "p1",
        practiceSlug: "renaissance",
        practiceName: "Renaissance",
        membershipId: "m1",
        role: "CLINICIAN",
      })
    })

    it("only considers ACTIVE memberships", async () => {
      // A departed membership must not resurrect access to the practice.
      signedIn()
      mockFindFirst.mockResolvedValue(null)

      await expect(getPracticeContext()).resolves.toBeNull()
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "u1", status: "ACTIVE" }),
        }),
      )
    })

    it("uses the practice named in the URL", async () => {
      signedIn()
      requestHeaders.set("x-practice-slug", "lekki")
      mockFindFirst.mockResolvedValue({
        id: "m2",
        practiceId: "p2",
        role: "OWNER",
        practice: { slug: "lekki", name: "Lekki" },
      })

      await expect(getPracticeContext()).resolves.toMatchObject({
        practiceSlug: "lekki",
      })
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ practice: { slug: "lekki" } }),
        }),
      )
    })

    it("refuses to fall back when the URL names a practice the user is not in", async () => {
      // The security-critical branch introduced by putting the slug in the
      // path. Falling back to another membership here would render one
      // practice under another practice's URL — silently the wrong records.
      signedIn()
      requestHeaders.set("x-practice-slug", "not-mine")
      requestCookie = "renaissance"
      mockFindFirst.mockResolvedValue(null)

      await expect(getPracticeContext()).resolves.toBeNull()
      // One lookup only: no cookie or first-membership fallback attempted.
      expect(mockFindFirst).toHaveBeenCalledTimes(1)
    })

    it("returns null when signed out, without querying memberships", async () => {
      mockGetServerSession.mockResolvedValue(null)

      await expect(getPracticeContext()).resolves.toBeNull()
      expect(mockFindFirst).not.toHaveBeenCalled()
    })
  })

  describe("requirePracticeContext", () => {
    it("redirects when signed in but belonging to no practice", async () => {
      signedIn()
      mockFindFirst.mockResolvedValue(null)

      await expect(requirePracticeContext()).rejects.toThrow("NEXT_REDIRECT")
      expect(mockRedirect).toHaveBeenCalledWith("/auth/signin")
    })
  })

  describe("practiceContextFailure", () => {
    it("is 401 when nobody is signed in", async () => {
      mockGetServerSession.mockResolvedValue(null)

      const response = await practiceContextFailure()
      expect(response.status).toBe(401)
    })

    it("is 403 when signed in with no practice — credentials are fine, tenancy is not", async () => {
      signedIn()

      const response = await practiceContextFailure()
      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({
        error: "No active practice for this account",
      })
    })
  })

  describe("noPractice", () => {
    it("is a 403, deliberately distinct from a 401", async () => {
      const response = noPractice()

      expect(response.status).toBe(403)
    })
  })
})
