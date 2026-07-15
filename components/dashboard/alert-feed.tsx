import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { AlertTriangle, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { SeverityBadge } from "@/components/ui/severity-badge"
import { EmptyState } from "@/components/layout/empty-state"
import { computeAlerts, getScaleMeta, getThresholdCrossed } from "@/lib/alert-rules"
import { cn } from "@/lib/utils"
import type { SeverityLevel } from "@/components/ui/severity-badge"

interface SessionWithPatient {
  id: string
  scale: string
  scaleName: string
  patientId: string
  patient: { anonymousId: string }
  storedSeverity?: string | null
  completedAt?: Date | null
  response: { totalScore: number; itemScores: unknown } | null
}

function toSeverityLevel(severity: string | null): SeverityLevel {
  if (severity === "critical" || severity === "high" || severity === "moderate") {
    return severity
  }
  return "low"
}

export function AlertFeed({ sessions }: { sessions: SessionWithPatient[] }) {
  const alerts = sessions
    .filter((s) => s.response)
    .map((s) => {
      const itemScores = s.response!.itemScores as Record<string, number>
      const result = computeAlerts(
        s.scale,
        s.response!.totalScore,
        itemScores,
        s.storedSeverity ?? undefined,
      )
      return {
        session: s,
        ...result,
        maxScore: getScaleMeta(s.scale)?.maxScore ?? null,
        threshold: getThresholdCrossed(s.scale, result.severity),
      }
    })
    .filter((a) => a.severity !== null)
    .sort((a, b) => {
      const order = { critical: 0, high: 1, moderate: 2 }
      const rank = order[a.severity!] - order[b.severity!]
      if (rank !== 0) return rank
      return (
        (b.session.completedAt?.getTime() ?? 0) -
        (a.session.completedAt?.getTime() ?? 0)
      )
    })

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="size-5" />}
        title="No patients require immediate attention"
        description="Completed assessments with elevated severity will appear here for clinical review."
      />
    )
  }

  const hasCritical = alerts.some((a) => a.severity === "critical")

  return (
    <Card
      id="alerts"
      className={cn(
        "scroll-mt-20 gap-0 overflow-hidden py-0 shadow-sm",
        hasCritical && "border-severity-critical/30",
      )}
    >
      <CardHeader className="border-b px-4 py-4 md:px-6">
        <CardTitle className="flex items-baseline gap-2 text-base font-semibold">
          Alert queue
          <span className="font-mono text-xs font-normal text-muted-foreground">
            {alerts.length}
          </span>
        </CardTitle>
      </CardHeader>

      {/* One divided list on every viewport; rows stack below md */}
      <div className="divide-y">
        {alerts.map(({ session, severity, suicidalIdeation, maxScore, threshold }) => (
          <div
            key={session.id}
            className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-4 md:px-6"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
              <SeverityBadge severity={toSeverityLevel(severity)} />
              <span className="min-w-16 text-sm font-medium">
                {session.patient.anonymousId}
              </span>
              <span className="text-sm text-muted-foreground">
                {session.scaleName}
              </span>
              <span className="font-mono text-sm tabular-nums">
                {session.response?.totalScore}
                {maxScore !== null && (
                  <span className="text-muted-foreground"> / {maxScore}</span>
                )}
              </span>
              {threshold !== null && (
                <span className="text-xs text-muted-foreground">
                  crossed {severity} at{" "}
                  <span className="font-mono tabular-nums">≥ {threshold}</span>
                </span>
              )}
              {session.completedAt && (
                <time
                  dateTime={session.completedAt.toISOString()}
                  className="text-xs text-muted-foreground"
                >
                  {formatDistanceToNowStrict(session.completedAt, {
                    addSuffix: true,
                  })}
                </time>
              )}
              {suicidalIdeation && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-severity-critical">
                  <AlertTriangle aria-hidden className="size-3.5" />
                  Suicidal ideation endorsed — immediate attention required
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full shrink-0 md:w-auto"
              asChild
            >
              <Link href={`/patients/${session.patientId}/sessions/${session.id}`}>
                Review
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}
