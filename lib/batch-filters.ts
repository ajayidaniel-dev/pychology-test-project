import type { SeverityLevel } from "@/components/ui/severity-badge"
import type { PatientListItem } from "@/lib/patient-summary"

/**
 * Criteria for narrowing a caseload before picking who goes into a batch.
 *
 * These narrow the list; the clinician's checkboxes are what actually commit a
 * patient to the batch. Nothing here is stored — selection is a snapshot taken
 * at creation, not a live cohort that re-evaluates later.
 */
export interface BatchCriteria {
  /** Empty or omitted means "any severity", including patients never assessed. */
  severity?: SeverityLevel[]
  /** Only patients whose last completed questionnaire is at least this old. */
  notAssessedInDays?: number
}

export const NOT_ASSESSED_IN_DAY_OPTIONS = [30, 60, 90, 180] as const

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Both fields come straight off `PatientListItem`, where `severity` is already
 * recomputed from raw item scores by `shapePatientListItem` rather than read
 * from the stored column — so filtering here agrees with what the UI shows.
 */
export function filterPatientsForBatch(
  patients: PatientListItem[],
  criteria: BatchCriteria,
  now: Date = new Date(),
): PatientListItem[] {
  const { severity, notAssessedInDays } = criteria

  return patients.filter((patient) => {
    if (severity && severity.length > 0) {
      if (!patient.severity || !severity.includes(patient.severity)) return false
    }

    if (notAssessedInDays != null) {
      // A patient who has never been assessed is overdue by definition — they
      // are exactly who a re-screening sweep should catch, so they pass.
      if (patient.lastAssessedAt) {
        const elapsed = now.getTime() - new Date(patient.lastAssessedAt).getTime()
        if (elapsed < notAssessedInDays * DAY_MS) return false
      }
    }

    return true
  })
}
