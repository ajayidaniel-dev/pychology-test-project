import dynamic from "next/dynamic"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NewSessionDialog } from "@/components/sessions/new-session-dialog"
import { computeAlerts } from "@/lib/alert-rules"
import { scaleNameToEnum } from "@/lib/patient-summary"
import { computeChartTrend, TREND_LABELS } from "@/lib/chart-trend"
import { PatientActions } from "@/components/patients/patient-actions"
import { PatientProfileHeader } from "@/components/patients/patient-profile-header"
import { PatientSessionsSection } from "@/components/patients/patient-sessions-section"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { SeverityLevel } from "@/components/ui/severity-badge"
import { Skeleton } from "@/components/ui/skeleton"

const SessionChart = dynamic(
  () =>
    import("@/components/sessions/session-chart").then((m) => ({
      default: m.SessionChart,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[220px] w-full rounded-lg" />,
  },
)

function toSeverityLevel(severity: string | null): SeverityLevel | null {
  if (severity === "critical" || severity === "high" || severity === "moderate") {
    return severity
  }
  if (severity === "low") return "low"
  return null
}

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const session = await getServerSession(authOptions)
  if (!session) return { title: "Patient" }

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, psychologistId: session.user.id },
    select: { displayName: true, anonymousId: true },
  })

  const label = patient?.displayName ?? patient?.anonymousId ?? "Patient"
  return { title: label }
}

export default async function PatientProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, psychologistId: session.user.id },
    include: {
      assessmentSessions: {
        include: { response: true, scale: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!patient) notFound()

  const completed = patient.assessmentSessions.filter((s) => s.response)
  const latest = completed.at(-1)

  const latestScaleId = latest?.scaleId
  const chartSessions = latestScaleId
    ? completed.filter((s) => s.scaleId === latestScaleId)
    : completed
  const chartData = chartSessions.map((s, i) => ({
    session: i + 1,
    score: s.response!.totalScore,
  }))
  const trend = computeChartTrend(chartData)

  const latestAlerts = latest?.response
    ? computeAlerts(
        scaleNameToEnum(latest.scale.name),
        latest.response.totalScore,
        latest.response.itemScores as Record<string, number>,
        latest.response.severity,
      )
    : null

  const headerSeverity = latestAlerts?.severity
    ? toSeverityLevel(latestAlerts.severity)
    : null

  const sessionRows = patient.assessmentSessions.map((s, i) => ({
    id: s.id,
    index: i + 1,
    scaleName: s.scale.name,
    status: s.status,
    score: s.response?.totalScore ?? null,
    severity: s.response?.severity ?? null,
    token: s.token,
  }))

  return (
    <div className="flex flex-col gap-6">
      <PatientProfileHeader
        anonymousId={patient.anonymousId}
        displayName={patient.displayName}
        completedCount={completed.length}
        severity={headerSeverity}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <NewSessionDialog patientId={patient.id} />
            <PatientActions
              patientId={patient.id}
              currentDisplayName={patient.displayName ?? patient.anonymousId}
            />
          </div>
        }
      />

      {latestAlerts?.suicidalIdeation && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle />
          <AlertTitle>Suicidal ideation endorsed</AlertTitle>
          <AlertDescription>
            Immediate clinical attention required. Review the latest assessment
            and follow your safety protocol.
          </AlertDescription>
        </Alert>
      )}

      {completed.length > 0 && latest && (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">
                Score History — {latest.scale.name}
              </CardTitle>
              <CardDescription>
                Sessions on the same scale for comparable scores
              </CardDescription>
            </div>
            <Badge variant="outline">{TREND_LABELS[trend]}</Badge>
          </CardHeader>
          <CardContent className="max-w-3xl">
            <SessionChart
              scale={scaleNameToEnum(latest.scale.name)}
              data={chartData}
            />
          </CardContent>
        </Card>
      )}

      <PatientSessionsSection
        patientId={patient.id}
        sessions={sessionRows}
      />
    </div>
  )
}
