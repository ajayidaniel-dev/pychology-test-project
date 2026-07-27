import dynamic from "next/dynamic"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isTokenExpired } from "@/lib/token"
import { NewSessionDialog } from "@/components/sessions/new-session-dialog"
import { SendQuestionnaireDialog } from "@/components/sessions/send-questionnaire-dialog"
import { sendStatus } from "@/lib/direct-sends"
import { computeAlerts } from "@/lib/alert-rules"
import {
  flattenQuestionnaires,
  PATIENT_QUESTIONNAIRES_INCLUDE,
  scaleNameToEnum,
} from "@/lib/patient-summary"
import { computeChartTrend, TREND_LABELS } from "@/lib/chart-trend"
import { PatientActions } from "@/components/patients/patient-actions"
import { PatientDetailsCard } from "@/components/patients/patient-details-card"
import { PatientProfileHeader } from "@/components/patients/patient-profile-header"
import { PatientSummaryCard } from "@/components/patients/patient-summary-card"
import type { PatientSummary } from "@/lib/patient-summary-ai"
import type { IntakeAnswers } from "@/lib/consent"
import { PatientSessionsSection } from "@/components/patients/patient-sessions-section"
import type { PatientSessionRow } from "@/components/patients/patient-sessions-section"
import { PatientDirectSendsSection } from "@/components/patients/patient-direct-sends-section"
import type { PatientDirectSendRow } from "@/components/patients/patient-direct-sends-section"
import { NotesSection } from "@/components/notes/notes-section"
import {
  PATIENT_TARGET,
  questionnaireTarget,
  sessionTarget,
  type NoteTarget,
} from "@/components/notes/note-target"
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
    include: PATIENT_QUESTIONNAIRES_INCLUDE,
  })

  if (!patient) notFound()

  // Charts, alerts and the summary all reason about questionnaires in
  // completion order, so flatten them out of their sessions first.
  const questionnaires = flattenQuestionnaires(patient.clinicalSessions)
  const completed = questionnaires.filter((q) => q.response)
  const latest = completed.at(-1)

  const latestScaleId = latest?.scaleId
  const chartQuestionnaires = latestScaleId
    ? completed.filter((q) => q.scaleId === latestScaleId)
    : completed
  const chartData = chartQuestionnaires.map((q, i) => ({
    session: i + 1,
    score: q.response!.totalScore,
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

  const latestConsented = [...patient.clinicalSessions]
    .reverse()
    .find((s) => s.consentAt)
  const latestIntake =
    ([...completed]
      .reverse()
      .find((q) => q.response?.intakeAnswers)?.response
      ?.intakeAnswers as IntakeAnswers | null) ?? null
  const patientHasDetails = Boolean(patient.fullName && patient.email)

  // Newest first: the appointment a clinician is most likely acting on.
  const orderedSessions = [...patient.clinicalSessions].reverse()

  // Appointments and direct sends share a table but never a list — a session is
  // something that happened with the clinician, a send is a link that went out.
  const appointments = orderedSessions.filter((s) => s.kind !== "DIRECT")
  const directSends = orderedSessions.filter((s) => s.kind === "DIRECT")

  const sessionRows: PatientSessionRow[] = appointments.map((s) => ({
    id: s.id,
    title: s.title,
    reason: s.reason,
    scheduledAt: s.scheduledAt,
    status: s.status,
    questionnaireCount: s.questionnaires.length,
    completedCount: s.questionnaires.filter((q) => q.status === "COMPLETED")
      .length,
    scaleNames: s.questionnaires.map((q) => q.scale.name),
    token: s.token,
    linkExpired: isTokenExpired(s.tokenExpiresAt),
  }))

  const directSendRows: PatientDirectSendRow[] = directSends.map((s) => ({
    id: s.id,
    title: s.title,
    sentAt: s.scheduledAt,
    questionnaireCount: s.questionnaires.length,
    completedCount: s.questionnaires.filter((q) => q.status === "COMPLETED")
      .length,
    status: sendStatus(s),
    token: s.token,
  }))

  // The composer can file a note against the patient, any session, or any
  // questionnaire, so the whole tree becomes selectable targets.
  const noteTargets: NoteTarget[] = [
    PATIENT_TARGET,
    ...orderedSessions.flatMap((s) => [
      sessionTarget(s),
      ...s.questionnaires.map((q) => questionnaireTarget(q, s)),
    ]),
  ]

  return (
    <div className="flex flex-col gap-6">
      <PatientProfileHeader
        anonymousId={patient.anonymousId}
        displayName={patient.displayName}
        fullName={patient.fullName}
        completedCount={completed.length}
        severity={headerSeverity}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SendQuestionnaireDialog
              patientId={patient.id}
              patientHasDetails={patientHasDetails}
            />
            <NewSessionDialog
              patientId={patient.id}
              patientHasDetails={patientHasDetails}
            />
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

      {completed.length > 0 && (
        <PatientSummaryCard
          completedCount={completed.length}
          summary={(patient.summary as PatientSummary | null) ?? null}
          generatedAt={patient.summaryGeneratedAt ?? null}
        />
      )}

      {completed.length > 0 && latest && (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">
                Score History — {latest.scale.name}
              </CardTitle>
              <CardDescription>
                Assessments on the same scale for comparable scores
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

      <PatientDetailsCard
        fullName={patient.fullName}
        email={patient.email}
        phone={patient.phone}
        dateOfBirth={patient.dateOfBirth}
        detailsUpdatedAt={patient.detailsUpdatedAt}
        consentAt={latestConsented?.consentAt ?? null}
        consentPolicyVersion={latestConsented?.consentPolicyVersion ?? null}
        intake={latestIntake}
      />

      <PatientSessionsSection patientId={patient.id} sessions={sessionRows} />

      <PatientDirectSendsSection
        patientId={patient.id}
        sends={directSendRows}
      />

      <NotesSection
        patientId={patient.id}
        defaultTarget={PATIENT_TARGET}
        targets={noteTargets}
        emptyDescription="Nothing recorded yet. Notes can be filed against the patient, a session, or a single questionnaire."
      />
    </div>
  )
}
