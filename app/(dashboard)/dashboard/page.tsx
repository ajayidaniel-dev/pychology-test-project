import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Dashboard",
}
import { AlertTriangle } from "lucide-react"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { StatCards } from "@/components/dashboard/stat-cards"
import { AlertFeed } from "@/components/dashboard/alert-feed"
import { CaseloadSection } from "@/components/dashboard/caseload-section"
import { PageHeader } from "@/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { shapePatientList, toCaseloadPatient, scaleNameToEnum } from "@/lib/patient-summary"
import { computeAlerts } from "@/lib/alert-rules"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  const patients = await prisma.patient.findMany({
    where: { psychologistId: session.user.id },
    include: {
      assessmentSessions: {
        include: { response: true, scale: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  const allSessions = patients.flatMap((p) =>
    p.assessmentSessions.map((s) => ({
      ...s,
      patient: { anonymousId: p.anonymousId },
    })),
  )

  const completedSessions = allSessions.filter(
    (s) => s.status === "COMPLETED" && s.response,
  )
  const pendingSessions = allSessions.filter((s) => s.status === "PENDING").length

  const alertFeedSessions = completedSessions.map((s) => ({
    id: s.id,
    patientId: s.patientId,
    patient: s.patient,
    scale: scaleNameToEnum(s.scale.name),
    scaleName: s.scale.name,
    response: s.response,
    storedSeverity: s.response?.severity,
  }))

  const alertCounts = completedSessions.reduce(
    (acc, s) => {
      const itemScores = s.response!.itemScores as Record<string, number>
      const scaleEnum = scaleNameToEnum(s.scale.name)
      const { severity } = computeAlerts(
        scaleEnum,
        s.response!.totalScore,
        itemScores,
        s.response!.severity,
      )
      if (severity === "critical") acc.critical++
      if (severity) acc.open++
      return acc
    },
    { open: 0, critical: 0 },
  )

  const caseloadPatients = shapePatientList(patients).map(toCaseloadPatient)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${session.user.name}`}
        hideTitleOnMobile
      />

      {alertCounts.critical > 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            {alertCounts.critical} critical alert
            {alertCounts.critical !== 1 ? "s" : ""} require attention
          </AlertTitle>
          <AlertDescription>
            Review flagged assessments below. Suicidal ideation endorsements take
            priority.
          </AlertDescription>
        </Alert>
      )}

      <StatCards
        stats={{
          totalPatients: patients.length,
          openAlerts: alertCounts.open,
          criticalAlerts: alertCounts.critical,
          pendingSessions,
        }}
      />

      <AlertFeed sessions={alertFeedSessions} />

      <CaseloadSection patients={caseloadPatients} />
    </div>
  )
}
