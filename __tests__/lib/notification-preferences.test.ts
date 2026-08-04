import { NotificationType } from "@prisma/client"

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    notificationPreference: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

import prisma from "@/lib/prisma"
import {
  NOTIFICATION_TYPE_ORDER,
  getNotificationPreferences,
  isNotificationEnabled,
  updateNotificationPreferences,
} from "@/lib/notification-preferences"

const findMany = prisma.notificationPreference.findMany as jest.Mock
const findUnique = prisma.notificationPreference.findUnique as jest.Mock
const upsert = prisma.notificationPreference.upsert as jest.Mock

describe("notification preferences", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    findMany.mockResolvedValue([])
    findUnique.mockResolvedValue(null)
  })

  it("defaults all notification types to enabled", async () => {
    const prefs = await getNotificationPreferences("user-1")
    expect(prefs).toHaveLength(NOTIFICATION_TYPE_ORDER.length)
    expect(prefs.every((item) => item.enabled)).toBe(true)
  })

  it("returns false when a preference is disabled", async () => {
    findUnique.mockResolvedValue({
      userId: "user-1",
      type: NotificationType.LOGIN,
      enabled: false,
    })

    await expect(
      isNotificationEnabled("user-1", NotificationType.LOGIN),
    ).resolves.toBe(false)
  })

  it("updates preferences", async () => {
    upsert.mockResolvedValue({
      userId: "user-1",
      type: NotificationType.LOGIN,
      enabled: false,
    })
    findMany.mockResolvedValue([
      {
        userId: "user-1",
        type: NotificationType.LOGIN,
        enabled: false,
      },
    ])

    const prefs = await updateNotificationPreferences("user-1", [
      { type: NotificationType.LOGIN, enabled: false },
    ])

    expect(upsert).toHaveBeenCalled()
    expect(prefs.find((item) => item.type === NotificationType.LOGIN)?.enabled).toBe(
      false,
    )
  })
})
