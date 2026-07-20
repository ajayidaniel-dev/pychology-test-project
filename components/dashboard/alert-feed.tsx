import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { AlertTriangle, Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { SeverityBadge } from "@/components/ui/severity-badge"
import { EmptyState } from "@/components/layout/empty-state"
import { computeAlerts, getScaleMeta, getThresholdCrossed } from "@/lib/alert-rules"
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

  return (
    <Card id="alerts" className="scroll-mt-20 gap-0 overflow-hidden py-0 shadow-sm">
      <CardHeader className="border-b px-4 py-4 md:px-6">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          Alert queue
          <Badge variant="secondary" className="tabular-nums">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      {/*
        Fixed column track so severity, ID, scale and score line up down the
        list — the previous flex-wrap let every row set its own rhythm, which
        made the queue unscannable. Rows stack below md.
      */}
      <div className="divide-y">
        {alerts.map(({ session, severity, suicidalIdeation, maxScore, threshold }) => (
          <div
            key={session.id}
            className="px-4 py-3 transition-colors hover:bg-muted/40 md:px-6"
          >
            <div className="flex flex-col gap-2 md:grid md:grid-cols-[6rem_4.5rem_1fr_auto_auto] md:items-center md:gap-4">
              {/* md:contents dissolves this wrapper back into the grid at
                  desktop, so mobile gets a tight badge+ID line without
                  needing a second markup branch. */}
              <div className="flex items-center gap-3 md:contents">
                {/* Both needed: self-start stops the pill stretching in the
                    mobile flex row, justify-self-start in the md grid. */}
                <SeverityBadge
                  severity={toSeverityLevel(severity)}
                  className="self-start justify-self-start"
                />
                <span className="text-sm font-medium">
                  {session.patient.anonymousId}
                </span>
              </div>

              <span className="truncate text-sm text-muted-foreground">
                {session.scaleName}
              </span>

              <div className="flex items-baseline gap-2 md:justify-end">
                <span className="font-mono text-sm tabular-nums">
                  {session.response?.totalScore}
                  {maxScore !== null && (
                    <span className="text-muted-foreground"> / {maxScore}</span>
                  )}
                </span>
                {threshold !== null && (
                  <span className="text-xs whitespace-nowrap text-muted-foreground">
                    ≥{" "}
                    <span className="font-mono tabular-nums">{threshold}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 md:justify-end">
                {session.completedAt && (
                  <time
                    dateTime={session.completedAt.toISOString()}
                    className="text-xs whitespace-nowrap text-muted-foreground"
                  >
                    {formatDistanceToNowStrict(session.completedAt, {
                      addSuffix: true,
                    })}
                  </time>
                )}
                <Button variant="outline" size="sm" className="shrink-0" asChild>
                  <Link
                    href={`/patients/${session.patientId}/sessions/${session.id}`}
                  >
                    Review
                    <span className="sr-only">
                      {" "}
                      {session.patient.anonymousId} {session.scaleName}
                    </span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Full-width: never compete with the score columns for space. */}
            {suicidalIdeation && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-severity-critical">
                <AlertTriangle aria-hidden className="size-3.5 shrink-0" />
                Suicidal ideation endorsed — immediate attention required
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
