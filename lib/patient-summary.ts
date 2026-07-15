import { computeAlerts } from "@/lib/alert-rules"
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

export interface PatientWithSessions {
  id: string
  anonymousId: string
  displayName: string | null
  createdAt: Date
  assessmentSessions: Array<{
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
}

export function shapePatientListItem(patient: PatientWithSessions): PatientListItem {
  const completed = patient.assessmentSessions.filter((s) => s.response)
  const latest = completed.at(-1)
  let severity: SeverityLevel | null = null

  if (latest?.response && latest.scale) {
    const itemScores = latest.response.itemScores as Record<string, number>
    const scaleEnum = scaleNameToEnum(latest.scale.name)
    const result = computeAlerts(
      scaleEnum,
      latest.response.totalScore,
      itemScores,
      latest.response.severity,
    )
    severity = toSeverityLevel(result.severity)
  }

  // Delta and trend compare like with like: only scores on the latest scale.
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
