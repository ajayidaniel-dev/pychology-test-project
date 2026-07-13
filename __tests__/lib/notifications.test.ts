import { NotificationType } from "@prisma/client"
import {
  buildSessionSubmitNotifications,
  loginDedupeKey,
  LINK_EXPIRING_WINDOW_MS,
} from "@/lib/notifications"

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    notification: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
    },
    assessmentSession: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}))

import prisma from "@/lib/prisma"

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe("buildSessionSubmitNotifications", () => {
  const baseCtx = {
    sessionId: "sess-1",
    patientId: "pat-1",
    psychologistId: "user-1",
    anonymousId: "PT-001",
    scaleName: "PHQ-9",
    totalScore: 22,
    itemScores: { "9": 2 },
    storedSeverity: "severe",
  }

  it("creates completed, SI, critical, and unreviewed for PHQ-9 SI + critical score", () => {
    const result = buildSessionSubmitNotifications(baseCtx)
    const types = result.map((n) => n.type)

    expect(types).toContain(NotificationType.QUESTIONNAIRE_COMPLETED)
    expect(types).toContain(NotificationType.SUICIDAL_IDEATION)
    expect(types).toContain(NotificationType.SEVERITY_CRITICAL)
    expect(types).toContain(NotificationType.UNREVIEWED_SEVERE)

    const si = result.find((n) => n.type === NotificationType.SUICIDAL_IDEATION)
    expect(si?.title).toBe("Suicidal ideation endorsed")
    expect(si?.href).toBe("/patients/pat-1/sessions/sess-1")
  })

  it("uses unique dedupe keys per notification type", () => {
    const result = buildSessionSubmitNotifications(baseCtx)
    const keys = result.map((n) => n.dedupeKey)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe("createNotification dedupe", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.notificationPreference.findUnique.mockResolvedValue(null)
    mockPrisma.notification.upsert.mockResolvedValue({
      id: "n1",
      userId: "user-1",
      type: NotificationType.LOGIN,
      title: "Signed in",
      body: "body",
      href: null,
      patientId: null,
      sessionId: null,
      dedupeKey: "login:user-1:2026-07-06",
      readAt: null,
      createdAt: new Date(),
    })
  })

  it("upserts by userId and dedupeKey", async () => {
    const { createNotification } = await import("@/lib/notifications")

    await createNotification({
      userId: "user-1",
      type: NotificationType.LOGIN,
      dedupeKey: "login:user-1:2026-07-06",
      title: "Signed in",
      body: "body",
    })

    expect(mockPrisma.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_dedupeKey: {
            userId: "user-1",
            dedupeKey: "login:user-1:2026-07-06",
          },
        },
      }),
    )
  })
})

describe("createLoginNotification", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.notificationPreference.findUnique.mockResolvedValue(null)
    mockPrisma.notification.upsert.mockResolvedValue({
      id: "n1",
      userId: "user-1",
      type: NotificationType.LOGIN,
      title: "Signed in to APAS",
      body: "You signed in to your account today.",
      href: null,
      patientId: null,
      sessionId: null,
      dedupeKey: loginDedupeKey("user-1"),
      readAt: null,
      createdAt: new Date(),
    })
  })

  it("uses daily dedupe key so only first login per day creates a row", async () => {
    const { createLoginNotification } = await import("@/lib/notifications")

    await createLoginNotification("user-1")

    expect(mockPrisma.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_dedupeKey: {
            userId: "user-1",
            dedupeKey: loginDedupeKey("user-1"),
          },
        },
        create: expect.objectContaining({
          type: NotificationType.LOGIN,
        }),
      }),
    )
  })
})

describe("reconcileOperationalNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.notificationPreference.findUnique.mockResolvedValue(null)
    mockPrisma.notification.upsert.mockResolvedValue({} as never)
    mockPrisma.assessmentSession.update.mockResolvedValue({} as never)
  })

  it("creates expiring and expired link notifications", async () => {
    const now = Date.now()
    mockPrisma.assessmentSession.findMany.mockResolvedValue([
      {
        id: "sess-expired",
        patientId: "pat-1",
        tokenExpiresAt: new Date(now - 1000),
        patient: { anonymousId: "PT-001" },
        scale: { name: "GAD-7" },
      },
      {
        id: "sess-expiring",
        patientId: "pat-2",
        tokenExpiresAt: new Date(now + LINK_EXPIRING_WINDOW_MS / 2),
        patient: { anonymousId: "PT-002" },
        scale: { name: "PHQ-9" },
      },
    ] as never)

    const { reconcileOperationalNotifications } = await import(
      "@/lib/notifications"
    )

    await reconcileOperationalNotifications("user-1")

    expect(mockPrisma.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: NotificationType.LINK_EXPIRED,
          dedupeKey: "session:sess-expired:link-expired",
        }),
      }),
    )

    expect(mockPrisma.assessmentSession.update).toHaveBeenCalledWith({
      where: { id: "sess-expired" },
      data: { status: "EXPIRED" },
    })

    expect(mockPrisma.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: NotificationType.LINK_EXPIRING_SOON,
          dedupeKey: "session:sess-expiring:link-expiring",
        }),
      }),
    )
  })
})

describe("resolveNotificationHref", () => {
  it("falls back to session page when href is missing", async () => {
    const { resolveNotificationHref } = await import("@/lib/notifications")

    expect(
      resolveNotificationHref({
        type: NotificationType.QUESTIONNAIRE_COMPLETED,
        href: null,
        patientId: "pat-1",
        sessionId: "sess-1",
      }),
    ).toBe("/patients/pat-1/sessions/sess-1")
  })

  it("falls back to patient page for link notifications", async () => {
    const { resolveNotificationHref } = await import("@/lib/notifications")

    expect(
      resolveNotificationHref({
        type: NotificationType.LINK_EXPIRED,
        href: null,
        patientId: "pat-1",
        sessionId: "sess-1",
      }),
    ).toBe("/patients/pat-1")
  })

  it("returns null for login notifications", async () => {
    const { resolveNotificationHref } = await import("@/lib/notifications")

    expect(
      resolveNotificationHref({
        type: NotificationType.LOGIN,
        href: null,
        patientId: null,
        sessionId: null,
      }),
    ).toBeNull()
  })
})

describe("loginDedupeKey", () => {
  it("is stable for the same calendar day", () => {
    const date = new Date("2026-07-06T15:00:00Z")
    expect(loginDedupeKey("user-1", date)).toBe("login:user-1:2026-07-06")
  })
})
