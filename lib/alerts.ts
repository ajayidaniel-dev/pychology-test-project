import { computeAlerts, type AlertResult } from "@/lib/alert-rules"
import { scaleNameToEnum } from "@/lib/patient-summary"
import prisma from "@/lib/prisma"

export interface AlertCounts {
  /** Assessments currently sitting at moderate or above. */
  open: number
  /** Subset of `open` at critical. */
  critical: number
}

interface ResponseRow {
  totalScore: number
  itemScores: unknown
  severity: string | null
  completedAt: Date | null
  questionnaire: {
    scaleId: string
    scale: { name: string }
    session: { patientId: string }
  }
}

/**
 * Reduce every completed response to the *current* alert state.
 *
 * "Current" means the latest completed response per patient + scale. A patient
 * whose PHQ-9 was critical in March and mild in June is not a critical alert;
 * counting every historical response would inflate the queue with results the
 * clinician already acted on.
 *
 * Severity comes from `computeAlerts`, never from the stored `severity` column
 * alone. For known instruments `computeAlerts` recomputes severity from the
 * published thresholds and only falls back to the stored column for unknown
 * scales, normalising its labels on the way ("severe" → critical, "mild" →
 * moderate). Reading the column directly would therefore produce a different
 * number than the dashboard for the same data. This is the single definition of
 * "critical" in the app; anything showing an alert count must come through here
 * or the figures will disagree with each other.
 *
 * Endorsed suicidal ideation is an INDEPENDENT alert condition. It raises an
 * alert on its own, in parallel with severity, and deliberately does not modify
 * the severity value: a PHQ-9 band is tied to the 0-27 score, so overwriting it
 * would make a patient's severity jump with no score change and corrupt the
 * trend chart, the delta column, and the score history. Callers that render a
 * band must therefore handle "alerting, but severity is null".
 */
/** Latest completed response per patient + scale — the app's "current state". */
export function latestPerPatientScale(rows: ResponseRow[]): ResponseRow[] {
  const latest = new Map<string, ResponseRow>()

  for (const row of rows) {
    const key = `${row.questionnaire.session.patientId}:${row.questionnaire.scaleId}`
    const previous = latest.get(key)
    if (
      !previous ||
      (row.completedAt?.getTime() ?? 0) > (previous.completedAt?.getTime() ?? 0)
    ) {
      latest.set(key, row)
    }
  }

  return [...latest.values()]
}

/**
 * Is ideation endorsed on ANY of this patient's current assessments?
 *
 * Not "on the most recent one". A patient whose PHQ-9 endorsed ideation and who
 * later completed a BDI-II is still a patient who endorsed ideation — reading
 * only the newest questionnaire hides the flag the moment any other instrument
 * is submitted after it.
 */
export function hasCurrentIdeation(rows: ResponseRow[]): boolean {
  return latestPerPatientScale(rows).some(
    (row) =>
      computeAlerts(
        scaleNameToEnum(row.questionnaire.scale.name),
        row.totalScore,
        row.itemScores as Record<string, number>,
        row.severity ?? undefined,
      ).suicidalIdeation,
  )
}

export function deriveAlertCounts(rows: ResponseRow[]): AlertCounts {
  const latest = new Map<string, ResponseRow>()

  for (const row of rows) {
    const key = `${row.questionnaire.session.patientId}:${row.questionnaire.scaleId}`
    const previous = latest.get(key)
    if (
      !previous ||
      (row.completedAt?.getTime() ?? 0) > (previous.completedAt?.getTime() ?? 0)
    ) {
      latest.set(key, row)
    }
  }

  let open = 0
  let critical = 0

  for (const row of latest.values()) {
    const { severity, suicidalIdeation }: AlertResult = computeAlerts(
      scaleNameToEnum(row.questionnaire.scale.name),
      row.totalScore,
      row.itemScores as Record<string, number>,
      row.severity ?? undefined,
    )

    if (severity || suicidalIdeation) open++
    if (severity === "critical" || suicidalIdeation) critical++
  }

  return { open, critical }
}

/**
 * Runs on every dashboard page render via the sidebar badge, so the select is
 * kept narrow. `itemScores` is included because `computeAlerts` reads it for
 * the ideation flag; if this ever shows up in profiling, that is the field to
 * drop for the count-only path.
 */
export async function getAlertCounts(psychologistId: string): Promise<AlertCounts> {
  const rows = await prisma.questionnaireResponse.findMany({
    where: { questionnaire: { session: { psychologistId } } },
    select: {
      totalScore: true,
      itemScores: true,
      severity: true,
      completedAt: true,
      questionnaire: {
        select: {
          scaleId: true,
          scale: { select: { name: true } },
          session: { select: { patientId: true } },
        },
      },
    },
  })

  return deriveAlertCounts(rows)
}
