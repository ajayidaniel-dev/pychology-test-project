import type { PrismaLike } from "@/lib/db"
import { getAlertCounts } from "@/lib/alerts"

export interface NavCounts {
  /** Questionnaires sent but not yet returned. */
  pendingQuestionnaires: number
  /** Assessments currently at critical, by the app's single alert definition. */
  criticalAlerts: number
}

/**
 * Counts rendered as sidebar badges.
 *
 * `criticalAlerts` routes through `lib/alerts.ts` rather than reading the
 * stored `severity` column, so the badge and the dashboard can never disagree —
 * that risk is exactly why this badge was deferred out of Phase 2 until the
 * derivation was centralised. It inherits that module's documented ideation
 * gap; the badge is not a substitute for the alert queue.
 *
 * `pendingQuestionnaires` matches the dashboard StatusBand's own definition.
 */
export async function getNavCounts(
  db: PrismaLike,
  psychologistId: string,
): Promise<NavCounts> {
  const [pendingQuestionnaires, alerts] = await Promise.all([
    db.questionnaire.count({
      where: {
        status: "PENDING",
        session: { psychologistId },
      },
    }),
    getAlertCounts(db, psychologistId),
  ])

  return { pendingQuestionnaires, criticalAlerts: alerts.critical }
}
