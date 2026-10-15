import { SeverityBadge } from "@/components/ui/severity-badge"
import { SeverityMeter } from "@/components/ui/severity-meter"
import type { SeverityLevel } from "@/components/ui/severity-badge"

interface PatientProfileHeaderProps {
  anonymousId: string
  displayName: string | null
  fullName?: string | null
  completedCount: number
  severity: SeverityLevel | null
  /** Latest assessment context, e.g. "PHQ-9 14/27". */
  latestSummary?: string | null
  lastAssessedLabel?: string | null
  actions: React.ReactNode
}

/**
 * Identity, current risk, and latest result — the three things a clinician
 * needs before doing anything else with this record.
 *
 * The in-page breadcrumb was removed: the app header already renders a "Back to
 * Patients" affordance, and two ways back stacked twenty pixels apart is
 * redundancy, not affordance.
 *
 * Severity is double-encoded (meter + badge) because this is the one place a
 * misread carries clinical weight; the meter survives greyscale, the badge
 * names the band.
 */
export function PatientProfileHeader({
  anonymousId,
  displayName,
  fullName,
  completedCount,
  severity,
  latestSummary,
  lastAssessedLabel,
  actions,
}: PatientProfileHeaderProps) {
  const identity = fullName ?? displayName
  const meta = [
    latestSummary,
    lastAssessedLabel ? `last assessed ${lastAssessedLabel}` : null,
    `${completedCount} completed assessment${completedCount !== 1 ? "s" : ""}`,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {severity && severity !== "none" && (
            <SeverityMeter severity={severity} />
          )}
          <h1 className="font-mono text-xl font-semibold tracking-tight tabular-nums">
            {anonymousId}
          </h1>
          {severity && severity !== "none" && (
            <SeverityBadge severity={severity} />
          )}
        </div>

        {identity && (
          <p className="truncate text-sm font-medium text-foreground">{identity}</p>
        )}

        <p className="text-sm text-muted-foreground">
          {meta.map((part, i) => (
            <span key={part}>
              {i > 0 && <span aria-hidden> · </span>}
              {part}
            </span>
          ))}
        </p>
      </div>

      <div className="shrink-0">{actions}</div>
    </div>
  )
}
