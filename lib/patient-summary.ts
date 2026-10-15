import {
  computeAlerts,
  getScaleMeta,
  getThresholdCrossed,
} from "@/lib/alert-rules"
import type { SeverityLevel } from "@/components/ui/severity-badge"

const SCALE_NAME_TO_ENUM: Record<string, string> = {
  "PHQ-9": "PHQ9",
  "BDI-II": "BDI2",
  "GAD-7": "GAD7",
}

export function scaleNameToEnum(name: string): string {
  return SCALE_NAME_TO_ENUM[name] ?? name
}

function toSeverityLevel(severity: string | null): SeverityLevel | null {
  if (severity === "critical" || severity === "high" || severity === "moderate") {
    return severity
  }
  if (severity === "low") return "low"
  return null
}

/**
 * Prisma include that reaches a patient's questionnaires through their
 * clinical sessions. Pair it with `flattenQuestionnaires` when you want the
 * flat chronological list the shaping helpers below expect.
 */
export const PATIENT_QUESTIONNAIRES_INCLUDE = {
  clinicalSessions: {
    include: {
      questionnaires: {
        include: { response: true, scale: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { scheduledAt: "asc" },
  },
} as const

/**
 * Questionnaires now live one level down, inside sessions. Flatten them back
 * into a single chronological list — ordered by when the patient actually
 * completed each one, falling back to the session's date for pending ones.
 */
export function flattenQuestionnaires<
  Q extends { response: { completedAt?: Date | null } | null },
>(sessions: Array<{ scheduledAt: Date; questionnaires: Q[] }>): Q[] {
  return sessions
    .flatMap((s) =>
      s.questionnaires.map((q) => ({
        q,
        at: q.response?.completedAt ?? s.scheduledAt,
      })),
    )
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((entry) => entry.q)
}

export interface PatientWithSessions {
  id: string
  anonymousId: string
  displayName: string | null
  createdAt: Date
  questionnaires: Array<{
    response: {
      totalScore: number
      itemScores: unknown
      severity: string | null
      completedAt?: Date | null
    } | null
    scale?: { name: string } | null
  }>
}

export interface PatientListItem {
  id: string
  anonymousId: string
  displayName: string | null
  sessionCount: number
  latestScore: number | null
  latestScaleName: string | null
  severity: SeverityLevel | null
  createdAt: Date
  /** Change vs. the previous assessment on the same scale; null when there is no prior score. */
  delta: number | null
  /** Total scores on the latest scale, oldest → newest (same-scale so points are comparable). */
  scoreHistory: number[]
  lastAssessedAt: Date | null
  /** Maximum possible score for the latest scale; null for custom scales. */
  latestMaxScore: number | null
  /** Lowest score of the band this result fell into; null when not derivable. */
  latestThreshold: number | null
}

/** Selection rank for "most concerning": lower is worse. */
const CONCERN_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
}

function concernOf(severity: string | null, ideation: boolean): number {
  // Ideation outranks every band, including critical. A severe GAD-7 from today
  // and a BDI-II disclosing suicidal thoughts from last week are both
  // critical-tier, but only one of them carries a safety action — so it is the
  // one the row should surface.
  if (ideation) return -1
  return severity ? (CONCERN_RANK[severity] ?? 4) : 5
}

/**
 * Shape one caseload row.
 *
 * The row represents the patient's **most concerning current assessment**, not
 * simply their newest one. "Current" is the latest response per instrument, and
 * the worst of those wins.
 *
 * This matters because the two answers differ in practice: a patient whose most
 * recent result is a mild PHQ-9 but who has a current severe PCL-5 was
 * rendering as moderate on the caseload while sitting in the alert queue as
 * critical on the same screen. For a triage surface answering "who needs me
 * right now", the newest result is the wrong one to show.
 *
 * Scale, score, severity, threshold, and date are all taken from the selected
 * assessment, so nothing within a row can disagree with anything else in it.
 */
export function shapePatientListItem(patient: PatientWithSessions): PatientListItem {
  const completed = patient.questionnaires.filter((s) => s.response)

  // Current state = the latest response per instrument.
  const currentByScale = new Map<string, (typeof completed)[number]>()
  for (const q of completed) {
    const key = q.scale?.name ?? "__unknown"
    const previous = currentByScale.get(key)
    if (
      !previous ||
      (q.response!.completedAt?.getTime() ?? 0) >=
        (previous.response!.completedAt?.getTime() ?? 0)
    ) {
      currentByScale.set(key, q)
    }
  }

  let selected: (typeof completed)[number] | undefined
  let selectedConcern = Number.POSITIVE_INFINITY
  let severity: SeverityLevel | null = null
  let latestMaxScore: number | null = null
  let latestThreshold: number | null = null

  for (const q of currentByScale.values()) {
    if (!q.scale) continue
    const scaleEnum = scaleNameToEnum(q.scale.name)
    const result = computeAlerts(
      scaleEnum,
      q.response!.totalScore,
      q.response!.itemScores as Record<string, number>,
      // computeAlerts takes `string | undefined`; the column is nullable.
      q.response!.severity ?? undefined,
    )
    const concern = concernOf(result.severity, result.suicidalIdeation)
    const isWorse =
      concern < selectedConcern ||
      // Tie on severity: prefer the more recent assessment.
      (concern === selectedConcern &&
        (q.response!.completedAt?.getTime() ?? 0) >
          (selected?.response!.completedAt?.getTime() ?? 0))

    if (isWorse) {
      selected = q
      selectedConcern = concern
      severity = toSeverityLevel(result.severity)
      // Known instruments only. Custom scales have no published cutoffs, and the
      // table renders the bare figure rather than inventing a denominator.
      latestMaxScore = getScaleMeta(scaleEnum)?.maxScore ?? null
      latestThreshold = getThresholdCrossed(scaleEnum, result.severity)
    }
  }

  // Fall back to the newest response when nothing resolved a scale at all.
  const latest = selected ?? completed.at(-1)

  // Delta and trend compare like with like: only scores on the selected scale.
  const sameScale = latest?.scale
    ? completed.filter((s) => s.scale?.name === latest.scale!.name)
    : []
  const scoreHistory = sameScale.map((s) => s.response!.totalScore)
  const previousScore =
    scoreHistory.length >= 2 ? scoreHistory[scoreHistory.length - 2] : null

  return {
    id: patient.id,
    anonymousId: patient.anonymousId,
    displayName: patient.displayName,
    sessionCount: completed.length,
    latestScore: latest?.response?.totalScore ?? null,
    latestScaleName: latest?.scale?.name ?? null,
    severity,
    createdAt: patient.createdAt,
    delta:
      previousScore !== null && latest?.response
        ? latest.response.totalScore - previousScore
        : null,
    scoreHistory,
    lastAssessedAt: latest?.response?.completedAt ?? null,
    latestMaxScore,
    latestThreshold,
  }
}

export function shapePatientList(
  patients: PatientWithSessions[],
): PatientListItem[] {
  return patients.map(shapePatientListItem)
}

/** Caseload preview shape (subset of PatientListItem without displayName/createdAt). */
export function toCaseloadPatient(
  item: PatientListItem,
): Pick<
  PatientListItem,
  | "id"
  | "anonymousId"
  | "latestScaleName"
  | "latestScore"
  | "sessionCount"
  | "severity"
  | "delta"
  | "scoreHistory"
  | "lastAssessedAt"
  | "latestMaxScore"
  | "latestThreshold"
> {
  return {
    id: item.id,
    anonymousId: item.anonymousId,
    latestScaleName: item.latestScaleName,
    latestScore: item.latestScore,
    sessionCount: item.sessionCount,
    severity: item.severity,
    delta: item.delta,
    scoreHistory: item.scoreHistory,
    lastAssessedAt: item.lastAssessedAt,
    latestMaxScore: item.latestMaxScore,
    latestThreshold: item.latestThreshold,
  }
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
}

/** Severity-first ordering so the top row answers "who needs attention now". */
export function bySeverityThenRecency(
  a: Pick<PatientListItem, "severity" | "lastAssessedAt">,
  b: Pick<PatientListItem, "severity" | "lastAssessedAt">,
): number {
  const rankA = a.severity ? SEVERITY_RANK[a.severity] ?? 4 : 4
  const rankB = b.severity ? SEVERITY_RANK[b.severity] ?? 4 : 4
  if (rankA !== rankB) return rankA - rankB
  return (b.lastAssessedAt?.getTime() ?? 0) - (a.lastAssessedAt?.getTime() ?? 0)
}
