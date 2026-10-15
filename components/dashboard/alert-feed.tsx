import Link from "next/link"
import { practiceHref } from "@/lib/practice-path-server"
import { formatDistanceToNowStrict } from "date-fns"
import { AlertTriangle, Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { SeverityBadge } from "@/components/ui/severity-badge"
import { ScoreReadout } from "@/components/ui/score-readout"
import { EmptyState } from "@/components/layout/empty-state"
import { computeAlerts, getScaleMeta, getThresholdCrossed } from "@/lib/alert-rules"
import type { SeverityLevel } from "@/components/ui/severity-badge"

interface SessionWithPatient {
  id: string
  scale: string
  scaleName: string
  patientId: string
  sessionId: string
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

/**
 * Endorsed ideation with a sub-threshold score has no severity band — the score
 * genuinely is low. Rendering a band here would either lie ("Low", next to a
 * safety warning) or corrupt the psychometrics ("Critical", for a score of 4).
 * It gets its own mark instead.
 */
function SafetyFlagBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 self-start justify-self-start rounded-full border border-severity-critical/25 bg-severity-critical/15 px-2 py-0.5 text-xs font-medium text-severity-critical-ink">
      <AlertTriangle className="size-3" aria-hidden />
      Safety flag
    </span>
  )
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
    // Ideation is an independent alert condition: a sub-threshold score with
    // item 9 endorsed still belongs in this queue. Filtering on severity alone
    // silently dropped exactly the cases the row's own safety warning was
    // written to display.
    .filter((a) => a.severity !== null || a.suicidalIdeation)
    .sort((a, b) => {
      const order = { critical: 0, high: 1, moderate: 2 }
      // Ideation sorts with critical regardless of band.
      const rankOf = (a: { severity: string | null; suicidalIdeation: boolean }) =>
        a.suicidalIdeation
          ? 0
          : order[a.severity as keyof typeof order] ?? 3
      const rank = rankOf(a) - rankOf(b)
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
        {alerts.map(({ session, severity, suicidalIdeation, maxScore, threshold }) => {
          const bandless = severity === null
          return (
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
                {bandless ? (
                  <SafetyFlagBadge />
                ) : (
                  <SeverityBadge
                    severity={toSeverityLevel(severity)}
                    className="self-start justify-self-start"
                  />
                )}
                <span className="text-sm font-medium">
                  {session.patient.anonymousId}
                </span>
              </div>

              <span className="truncate text-sm text-muted-foreground">
                {session.scaleName}
              </span>

              {/* Same readout as the caseload grid — one score vocabulary
                  across the app, so a figure means the same thing wherever a
                  clinician meets it. */}
              <div className="md:flex md:justify-end">
                <ScoreReadout
                  score={session.response?.totalScore ?? null}
                  maxScore={maxScore}
                  threshold={threshold}
                  className="items-start md:items-end"
                />
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
                    href={practiceHref(`/patients/${session.patientId}/sessions/${session.sessionId}/questionnaires/${session.id}`)}
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
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-severity-critical-ink">
                <AlertTriangle aria-hidden className="size-3.5 shrink-0" />
                Suicidal ideation endorsed — immediate attention required
              </p>
            )}
          </div>
          )
        })}
      </div>
    </Card>
  )
}
