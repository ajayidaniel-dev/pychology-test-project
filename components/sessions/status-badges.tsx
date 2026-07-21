import { Badge } from "@/components/ui/badge"

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
