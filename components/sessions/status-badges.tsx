import { Badge } from "@/components/ui/badge"
import type { SendStatus } from "@/lib/direct-sends"

/** Where a questionnaire stands: waiting on the patient, done, or timed out. */
export function QuestionnaireStatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <Badge variant="outline" className="border-severity-low/40 text-severity-low">
        Completed
      </Badge>
    )
  }
  if (status === "PENDING") {
    return (
      <Badge
        variant="outline"
        className="border-severity-moderate/40 text-severity-moderate"
      >
        Pending
      </Badge>
    )
  }
  if (status === "EXPIRED") {
    return <Badge variant="secondary">Expired</Badge>
  }
  return <Badge variant="secondary">{status}</Badge>
}

/**
 * Where a whole send stands, rolled up from its questionnaires and its link.
 * A direct send has no appointment to be "scheduled", so this — not
 * `SessionStatusBadge` — is what its rows and headers show.
 */
export type { SendStatus }

export function SendStatusBadge({ status }: { status: SendStatus }) {
  if (status === "completed") {
    return (
      <Badge variant="outline" className="border-severity-low/40 text-severity-low">
        Completed
      </Badge>
    )
  }
  if (status === "expired") return <Badge variant="secondary">Expired</Badge>
  if (status === "cancelled") return <Badge variant="secondary">Cancelled</Badge>
  return (
    <Badge
      variant="outline"
      className="border-severity-moderate/40 text-severity-moderate"
    >
      Pending
    </Badge>
  )
}

/** The appointment's own state — separate from questionnaire progress. */
export function SessionStatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <Badge variant="outline" className="border-severity-low/40 text-severity-low">
        Completed
      </Badge>
    )
  }
  if (status === "CANCELLED") {
    return <Badge variant="secondary">Cancelled</Badge>
  }
  return <Badge variant="outline">Scheduled</Badge>
}
