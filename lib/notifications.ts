import { NotificationType, type Notification } from "@prisma/client"
import prisma from "@/lib/prisma"
import { isNotificationEnabled } from "@/lib/notification-preferences"
import { computeAlerts } from "@/lib/alert-rules"
import { scaleNameToEnum } from "@/lib/patient-summary"
import { isTokenExpired } from "@/lib/token"

export const LINK_EXPIRING_WINDOW_MS = 24 * 60 * 60 * 1000

const TYPE_PRIORITY: Record<NotificationType, number> = {
  SUICIDAL_IDEATION: 0,
  SEVERITY_CRITICAL: 1,
  SEVERITY_HIGH: 2,
  UNREVIEWED_SEVERE: 3,
  QUESTIONNAIRE_COMPLETED: 4,
  LINK_EXPIRING_SOON: 5,
  LINK_EXPIRED: 6,
  LOGIN: 7,
}

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  dedupeKey: string
  href?: string | null
  patientId?: string | null
  sessionId?: string | null
}

export interface SessionSubmitContext {
  sessionId: string
  patientId: string
  psychologistId: string
  anonymousId: string
  scaleName: string
  totalScore: number
  itemScores: Record<string, number>
  storedSeverity: string
}

export function buildSessionSubmitNotifications(
  ctx: SessionSubmitContext,
): CreateNotificationInput[] {
  const scale = scaleNameToEnum(ctx.scaleName)
  const alerts = computeAlerts(
    scale,
    ctx.totalScore,
    ctx.itemScores,
    ctx.storedSeverity,
  )
  const href = `/patients/${ctx.patientId}/sessions/${ctx.sessionId}`
  const base = {
    userId: ctx.psychologistId,
    patientId: ctx.patientId,
    sessionId: ctx.sessionId,
    href,
  }

  const notifications: CreateNotificationInput[] = [
    {
      ...base,
      type: NotificationType.QUESTIONNAIRE_COMPLETED,
      dedupeKey: `session:${ctx.sessionId}:completed`,
      title: "Questionnaire completed",
      body: `${ctx.anonymousId} completed ${ctx.scaleName}.`,
    },
  ]

  if (alerts.suicidalIdeation) {
    notifications.push({
      ...base,
      type: NotificationType.SUICIDAL_IDEATION,
      dedupeKey: `session:${ctx.sessionId}:si`,
      title: "Suicidal ideation endorsed",
      body: `${ctx.anonymousId} endorsed suicidal ideation on ${ctx.scaleName}. Immediate review required.`,
    })
  }

  if (alerts.severity === "critical") {
    notifications.push({
      ...base,
      type: NotificationType.SEVERITY_CRITICAL,
      dedupeKey: `session:${ctx.sessionId}:critical`,
      title: "Critical severity result",
      body: `${ctx.anonymousId} scored ${ctx.totalScore} on ${ctx.scaleName} (critical).`,
    })
  } else if (alerts.severity === "high") {
    notifications.push({
      ...base,
      type: NotificationType.SEVERITY_HIGH,
      dedupeKey: `session:${ctx.sessionId}:high`,
      title: "High severity result",
      body: `${ctx.anonymousId} scored ${ctx.totalScore} on ${ctx.scaleName} (high).`,
    })
  }

  if (
    alerts.severity === "moderate" ||
    alerts.severity === "high" ||
    alerts.severity === "critical"
  ) {
    notifications.push({
      ...base,
      type: NotificationType.UNREVIEWED_SEVERE,
      dedupeKey: `session:${ctx.sessionId}:unreviewed`,
      title: "Unreviewed assessment",
      body: `${ctx.anonymousId}'s ${ctx.scaleName} result needs clinical review.`,
    })
  }

  return notifications
}

const SESSION_LINK_TYPES = new Set<NotificationType>([
  NotificationType.QUESTIONNAIRE_COMPLETED,
  NotificationType.SEVERITY_CRITICAL,
  NotificationType.SEVERITY_HIGH,
  NotificationType.SUICIDAL_IDEATION,
  NotificationType.UNREVIEWED_SEVERE,
])

const PATIENT_LINK_TYPES = new Set<NotificationType>([
  NotificationType.LINK_EXPIRING_SOON,
  NotificationType.LINK_EXPIRED,
])

export function resolveNotificationHref(
  item: Pick<Notification, "type" | "href" | "patientId" | "sessionId">,
): string | null {
  if (item.href) return item.href

  if (
    item.sessionId &&
    item.patientId &&
    SESSION_LINK_TYPES.has(item.type)
  ) {
    return `/patients/${item.patientId}/sessions/${item.sessionId}`
  }

  if (item.patientId && PATIENT_LINK_TYPES.has(item.type)) {
    return `/patients/${item.patientId}`
  }

  return null
}

export function loginDedupeKey(userId: string, date = new Date()): string {
  const day = date.toISOString().slice(0, 10)
  return `login:${userId}:${day}`
}

export function sortNotifications(items: Notification[]): Notification[] {
  return [...items].sort((a, b) => {
    const readA = a.readAt ? 1 : 0
    const readB = b.readAt ? 1 : 0
    if (readA !== readB) return readA - readB

    const priorityA = TYPE_PRIORITY[a.type]
    const priorityB = TYPE_PRIORITY[b.type]
    if (priorityA !== priorityB) return priorityA - priorityB

    return b.createdAt.getTime() - a.createdAt.getTime()
  })
}

export async function createNotification(
  data: CreateNotificationInput,
): Promise<Notification | null> {
  if (!(await isNotificationEnabled(data.userId, data.type))) {
    return null
  }

  return prisma.notification.upsert({
    where: {
      userId_dedupeKey: {
        userId: data.userId,
        dedupeKey: data.dedupeKey,
      },
    },
    create: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      href: data.href ?? null,
      patientId: data.patientId ?? null,
      sessionId: data.sessionId ?? null,
      dedupeKey: data.dedupeKey,
    },
    update: {
      href: data.href ?? undefined,
      patientId: data.patientId ?? undefined,
      sessionId: data.sessionId ?? undefined,
    },
  })
}

export async function createSessionSubmitNotifications(
  ctx: SessionSubmitContext,
): Promise<void> {
  const payloads = buildSessionSubmitNotifications(ctx)
  await Promise.all(payloads.map((payload) => createNotification(payload)))
}

export async function createLoginNotification(userId: string): Promise<void> {
  await createNotification({
    userId,
    type: NotificationType.LOGIN,
    dedupeKey: loginDedupeKey(userId),
    title: "Signed in to APAS",
    body: "You signed in to your account today.",
  })
}

export async function resolveUnreviewedForSession(
  sessionId: string,
): Promise<void> {
  await prisma.notification.deleteMany({
    where: {
      sessionId,
      type: NotificationType.UNREVIEWED_SEVERE,
    },
  })
}

export async function reconcileOperationalNotifications(
  userId: string,
): Promise<void> {
  const now = Date.now()
  const pendingSessions = await prisma.assessmentSession.findMany({
    where: {
      psychologistId: userId,
      status: "PENDING",
    },
    include: {
      patient: { select: { anonymousId: true } },
      scale: { select: { name: true } },
    },
  })

  for (const session of pendingSessions) {
    const href = `/patients/${session.patientId}`
    const label = `${session.patient.anonymousId} — ${session.scale.name}`

    if (isTokenExpired(session.tokenExpiresAt)) {
      await createNotification({
        userId,
        type: NotificationType.LINK_EXPIRED,
        dedupeKey: `session:${session.id}:link-expired`,
        title: "Questionnaire link expired",
        body: `${label}: patient didn't complete. Send a new link.`,
        href,
        patientId: session.patientId,
        sessionId: session.id,
      })

      await prisma.assessmentSession.update({
        where: { id: session.id },
        data: { status: "EXPIRED" },
      })
      continue
    }

    const msUntilExpiry = session.tokenExpiresAt.getTime() - now
    if (msUntilExpiry <= LINK_EXPIRING_WINDOW_MS) {
      await createNotification({
        userId,
        type: NotificationType.LINK_EXPIRING_SOON,
        dedupeKey: `session:${session.id}:link-expiring`,
        title: "Questionnaire link expiring soon",
        body: `${label}: link expires within 24 hours. Send a reminder or create a new link.`,
        href,
        patientId: session.patientId,
        sessionId: session.id,
      })
    }
  }
}

export async function listNotifications(
  userId: string,
  limit = 30,
): Promise<{ items: Notification[]; unreadCount: number }> {
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit * 2,
  })

  const sorted = sortNotifications(items).slice(0, limit)
  const enriched = sorted.map((item) => ({
    ...item,
    href: resolveNotificationHref(item),
  }))
  const unreadCount = await prisma.notification.count({
    where: { userId, readAt: null },
  })

  return { items: enriched, unreadCount }
}

export async function markNotificationRead(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  })
  return result.count > 0
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
}
