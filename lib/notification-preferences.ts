import { NotificationType } from "@prisma/client"
import prisma from "@/lib/prisma"

export const NOTIFICATION_TYPE_ORDER: NotificationType[] = [
  NotificationType.SUICIDAL_IDEATION,
  NotificationType.SEVERITY_CRITICAL,
  NotificationType.SEVERITY_HIGH,
  NotificationType.UNREVIEWED_SEVERE,
  NotificationType.QUESTIONNAIRE_COMPLETED,
  NotificationType.LINK_EXPIRING_SOON,
  NotificationType.LINK_EXPIRED,
  NotificationType.LOGIN,
]

export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  { label: string; description: string }
> = {
  SUICIDAL_IDEATION: {
    label: "Suicidal ideation",
    description: "When a patient endorses suicidal ideation on an assessment.",
  },
  SEVERITY_CRITICAL: {
    label: "Critical severity",
    description: "When a completed assessment scores in the critical range.",
  },
  SEVERITY_HIGH: {
    label: "High severity",
    description: "When a completed assessment scores in the high range.",
  },
  UNREVIEWED_SEVERE: {
    label: "Unreviewed assessments",
    description: "When a moderate or higher result still needs clinical review.",
  },
  QUESTIONNAIRE_COMPLETED: {
    label: "Questionnaire completed",
    description: "When a patient submits a completed questionnaire.",
  },
  LINK_EXPIRING_SOON: {
    label: "Link expiring soon",
    description: "When a patient questionnaire link expires within 24 hours.",
  },
  LINK_EXPIRED: {
    label: "Link expired",
    description: "When a patient questionnaire link has expired without completion.",
  },
  LOGIN: {
    label: "Sign-in activity",
    description: "A daily confirmation when you sign in to your account.",
  },
}

export type NotificationPreferenceItem = {
  type: NotificationType
  enabled: boolean
  label: string
  description: string
}

export function defaultPreferences(): Record<NotificationType, boolean> {
  return Object.fromEntries(
    NOTIFICATION_TYPE_ORDER.map((type) => [type, true]),
  ) as Record<NotificationType, boolean>
}

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferenceItem[]> {
  const rows = await prisma.notificationPreference.findMany({
    where: { userId },
  })

  const enabledByType = defaultPreferences()
  for (const row of rows) {
    enabledByType[row.type] = row.enabled
  }

  return NOTIFICATION_TYPE_ORDER.map((type) => ({
    type,
    enabled: enabledByType[type],
    label: NOTIFICATION_TYPE_META[type].label,
    description: NOTIFICATION_TYPE_META[type].description,
  }))
}

export async function isNotificationEnabled(
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  const pref = await prisma.notificationPreference.findUnique({
    where: {
      userId_type: { userId, type },
    },
  })
  return pref?.enabled ?? true
}

export async function updateNotificationPreferences(
  userId: string,
  updates: Array<{ type: NotificationType; enabled: boolean }>,
): Promise<NotificationPreferenceItem[]> {
  await Promise.all(
    updates.map((item) =>
      prisma.notificationPreference.upsert({
        where: {
          userId_type: { userId: userId, type: item.type },
        },
        create: {
          userId,
          type: item.type,
          enabled: item.enabled,
        },
        update: {
          enabled: item.enabled,
        },
      }),
    ),
  )

  return getNotificationPreferences(userId)
}
