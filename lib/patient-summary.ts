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

  return {
    id: patient.id,
    anonymousId: patient.anonymousId,
    displayName: patient.displayName,
    sessionCount: completed.length,
    latestScore: latest?.response?.totalScore ?? null,
    latestScaleName: latest?.scale?.name ?? null,
    severity,
    createdAt: patient.createdAt,
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
  "id" | "anonymousId" | "latestScaleName" | "latestScore" | "sessionCount" | "severity"
> {
  return {
    id: item.id,
    anonymousId: item.anonymousId,
    latestScaleName: item.latestScaleName,
    latestScore: item.latestScore,
    sessionCount: item.sessionCount,
    severity: item.severity,
  }
}
