import Link from "next/link"
import { AlertTriangle, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SeverityBadge } from "@/components/ui/severity-badge"
import { EmptyState } from "@/components/layout/empty-state"
import { computeAlerts } from "@/lib/alert-rules"
import type { SeverityLevel } from "@/components/ui/severity-badge"

interface SessionWithPatient {
  id: string
  scale: string
  scaleName: string
  patientId: string
  patient: { anonymousId: string }
  storedSeverity?: string | null
  response: { totalScore: number; itemScores: Record<string, number> } | null
}

function toSeverityLevel(severity: string | null): SeverityLevel {
  if (severity === "critical" || severity === "high" || severity === "moderate") {
    return severity
  }
  return "low"
}

function SiAlert() {
  return (
    <Alert variant="destructive" className="py-2">
      <AlertTriangle />
      <AlertTitle className="text-xs">Suicidal ideation endorsed</AlertTitle>
      <AlertDescription className="text-xs">
        Immediate clinical attention required.
      </AlertDescription>
    </Alert>
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
      return { session: s, ...result }
    })
    .filter((a) => a.severity !== null)
    .sort((a, b) => {
      const order = { critical: 0, high: 1, moderate: 2 }
      return order[a.severity!] - order[b.severity!]
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
    <Card id="alerts" className="scroll-mt-20 overflow-hidden py-0 shadow-sm">
      <CardHeader className="border-b px-4 py-4 md:px-6">
        <CardTitle className="text-base font-semibold">Open Alerts</CardTitle>
      </CardHeader>

      {/* Desktop list */}
      <div className="hidden divide-y md:block">
        {alerts.map(({ session, severity, suicidalIdeation }) => (
          <div
            key={session.id}
            className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-4 md:px-6"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 md:gap-4">
              <SeverityBadge severity={toSeverityLevel(severity)} />
              <span className="min-w-16 text-sm font-medium">
                {session.patient.anonymousId}
              </span>
              <span className="text-sm text-muted-foreground">
                {session.scaleName} · Score {session.response?.totalScore}
              </span>
            </div>
            {suicidalIdeation && (
              <div className="w-full md:max-w-xs md:shrink-0">
                <SiAlert />
              </div>
            )}
            <Button variant="outline" size="sm" className="shrink-0" asChild>
              <Link href={`/patients/${session.patientId}/sessions/${session.id}`}>
                Review
              </Link>
            </Button>
          </div>
        ))}
      </div>

      {/* Mobile card stack */}
      <CardContent className="space-y-3 p-4 md:hidden">
        {alerts.map(({ session, severity, suicidalIdeation }) => (
          <div
            key={session.id}
            className="rounded-lg border bg-card p-4 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <SeverityBadge severity={toSeverityLevel(severity)} />
              <span className="text-sm font-semibold">
                {session.patient.anonymousId}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {session.scaleName} · Score {session.response?.totalScore}
            </p>
            {suicidalIdeation && (
              <div className="mt-3">
                <SiAlert />
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
              <Link href={`/patients/${session.patientId}/sessions/${session.id}`}>
                Review assessment
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
