import { NotificationType } from "@prisma/client"
import {
  buildQuestionnaireSubmitNotifications,
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
    clinicalSession: {
      findMany: jest.fn(),
    },
    questionnaire: {
      updateMany: jest.fn(),
    },
  },
}))

import prisma from "@/lib/prisma"

const notificationUpsert = prisma.notification.upsert as jest.Mock
const preferenceFindUnique = prisma.notificationPreference
  .findUnique as jest.Mock
const questionnaireUpdateMany = prisma.questionnaire.updateMany as jest.Mock
const clinicalSessionFindMany = prisma.clinicalSession.findMany as jest.Mock

describe("buildQuestionnaireSubmitNotifications", () => {
  const baseCtx = {
    questionnaireId: "q-1",
    practiceId: "practice-1",
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
    const result = buildQuestionnaireSubmitNotifications(baseCtx)
    const types = result.map((n: { type: NotificationType }) => n.type)

    expect(types).toContain(NotificationType.QUESTIONNAIRE_COMPLETED)
    expect(types).toContain(NotificationType.SUICIDAL_IDEATION)
    expect(types).toContain(NotificationType.SEVERITY_CRITICAL)
    expect(types).toContain(NotificationType.UNREVIEWED_SEVERE)

    const si = result.find(
      (n: { type: NotificationType }) =>
        n.type === NotificationType.SUICIDAL_IDEATION,
    )
    expect(si?.title).toBe("Suicidal ideation endorsed")
    expect(si?.href).toBe(
      "/patients/pat-1/sessions/sess-1/questionnaires/q-1",
    )
  })

  it("uses unique dedupe keys per notification type", () => {
    const result = buildQuestionnaireSubmitNotifications(baseCtx)
    const keys = result.map((n: { dedupeKey: string }) => n.dedupeKey)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe("createNotification dedupe", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    preferenceFindUnique.mockResolvedValue(null)
    notificationUpsert.mockResolvedValue({
      id: "n1",
      userId: "user-1",
      type: NotificationType.LOGIN,
      title: "Signed in",
      body: "body",
      href: null,
      patientId: null,
      sessionId: null,
      questionnaireId: null,
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

    expect(notificationUpsert).toHaveBeenCalledWith(
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
    preferenceFindUnique.mockResolvedValue(null)
    notificationUpsert.mockResolvedValue({
      id: "n1",
      userId: "user-1",
      type: NotificationType.LOGIN,
      title: "Signed in to APAS",
      body: "You signed in to your account today.",
      href: null,
      patientId: null,
      sessionId: null,
      questionnaireId: null,
      dedupeKey: loginDedupeKey("user-1"),
      readAt: null,
      createdAt: new Date(),
    })
  })

  it("uses daily dedupe key so only first login per day creates a row", async () => {
    const { createLoginNotification } = await import("@/lib/notifications")

    await createLoginNotification("user-1")

    expect(notificationUpsert).toHaveBeenCalledWith(
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
    preferenceFindUnique.mockResolvedValue(null)
    notificationUpsert.mockResolvedValue({})
    questionnaireUpdateMany.mockResolvedValue({})
  })

  it("creates expiring and expired link notifications", async () => {
    const now = Date.now()
    clinicalSessionFindMany.mockResolvedValue([
      {
        id: "sess-expired",
        patientId: "pat-1",
        title: "Intake",
        status: "SCHEDULED",
        tokenExpiresAt: new Date(now - 1000),
        patient: { anonymousId: "PT-001" },
        questionnaires: [{ scale: { name: "GAD-7" } }],
      },
      {
        id: "sess-expiring",
        patientId: "pat-2",
        title: "Week 4 review",
        status: "SCHEDULED",
        tokenExpiresAt: new Date(now + LINK_EXPIRING_WINDOW_MS / 2),
        patient: { anonymousId: "PT-002" },
        questionnaires: [{ scale: { name: "PHQ-9" } }],
      },
    ])

    const { reconcileOperationalNotifications } = await import(
      "@/lib/notifications"
    )

    await reconcileOperationalNotifications(prisma, "user-1")

    expect(notificationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: NotificationType.LINK_EXPIRED,
          dedupeKey: "session:sess-expired:link-expired",
        }),
      }),
    )

    // Expiry now knocks out the session's outstanding questionnaires, since
    // the token that gated them lives on the session.
    expect(questionnaireUpdateMany).toHaveBeenCalledWith({
      where: { sessionId: "sess-expired", status: "PENDING" },
      data: { status: "EXPIRED" },
    })

    expect(notificationUpsert).toHaveBeenCalledWith(
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
  it("falls back to the questionnaire page when href is missing", async () => {
    const { resolveNotificationHref } = await import("@/lib/notifications")

    expect(
      resolveNotificationHref({
        type: NotificationType.QUESTIONNAIRE_COMPLETED,
        href: null,
        patientId: "pat-1",
        sessionId: "sess-1",
        questionnaireId: "q-1",
      }),
    ).toBe("/patients/pat-1/sessions/sess-1/questionnaires/q-1")
  })

  it("falls back to the session page for link notifications", async () => {
    const { resolveNotificationHref } = await import("@/lib/notifications")

    expect(
      resolveNotificationHref({
        type: NotificationType.LINK_EXPIRED,
        href: null,
        patientId: "pat-1",
        sessionId: "sess-1",
        questionnaireId: null,
      }),
    ).toBe("/patients/pat-1/sessions/sess-1")
  })

  it("returns null for login notifications", async () => {
    const { resolveNotificationHref } = await import("@/lib/notifications")

    expect(
      resolveNotificationHref({
        type: NotificationType.LOGIN,
        href: null,
        patientId: null,
        sessionId: null,
        questionnaireId: null,
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
