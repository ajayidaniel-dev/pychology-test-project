import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Dashboard",
}
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { StatusBand } from "@/components/dashboard/status-band"
import { AlertFeed } from "@/components/dashboard/alert-feed"
import { CaseloadSection } from "@/components/dashboard/caseload-section"
import { PageHeader } from "@/components/layout/page-header"
import {
  shapePatientList,
  toCaseloadPatient,
  bySeverityThenRecency,
  scaleNameToEnum,
  PATIENT_QUESTIONNAIRES_INCLUDE,
  flattenQuestionnaires,
} from "@/lib/patient-summary"
import { computeAlerts } from "@/lib/alert-rules"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  const patients = await prisma.patient.findMany({
    where: { psychologistId: session.user.id },
    include: PATIENT_QUESTIONNAIRES_INCLUDE,
  })

  const allQuestionnaires = patients.flatMap((p) =>
    flattenQuestionnaires(p.clinicalSessions).map((q) => ({
      ...q,
      patientId: p.id,
      patient: { anonymousId: p.anonymousId },
    })),
  )

  const completed = allQuestionnaires.filter(
    (q) => q.status === "COMPLETED" && q.response,
  )
  const pendingQuestionnaires = allQuestionnaires.filter(
    (q) => q.status === "PENDING",
  ).length

  // Alerts reflect current state: only the latest completed assessment per
  // patient + scale. Superseded results belong on the patient page, not here.
  const latestByPatientScale = new Map<string, (typeof completed)[number]>()
  for (const q of completed) {
    const key = `${q.patientId}:${q.scaleId}`
    const prev = latestByPatientScale.get(key)
    if (
      !prev ||
      (q.response!.completedAt?.getTime() ?? 0) >
        (prev.response!.completedAt?.getTime() ?? 0)
    ) {
      latestByPatientScale.set(key, q)
    }
  }
  const currentSessions = [...latestByPatientScale.values()]

  const alertFeedSessions = currentSessions.map((q) => ({
    id: q.id,
    sessionId: q.sessionId,
    patientId: q.patientId,
    patient: q.patient,
    scale: scaleNameToEnum(q.scale.name),
    scaleName: q.scale.name,
    response: q.response,
    storedSeverity: q.response?.severity,
    completedAt: q.response?.completedAt ?? null,
  }))

  const alertCounts = currentSessions.reduce(
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

  const caseloadPatients = shapePatientList(
    patients.map((p) => ({
      ...p,
      questionnaires: flattenQuestionnaires(p.clinicalSessions),
    })),
  )
    .map(toCaseloadPatient)
    .sort(bySeverityThenRecency)

  return (
    <div className="flex flex-col gap-6">
      {/* The sticky header already names the page; repeating "Dashboard" here
          was pure duplication. Keep the greeting as the only lead-in. */}
      <PageHeader
        title={`Welcome back, ${session.user.name}`}
        description="Here's what needs your attention today."
      />

      <StatusBand
        stats={{
          totalPatients: patients.length,
          openAlerts: alertCounts.open,
          criticalAlerts: alertCounts.critical,
          pendingSessions: pendingQuestionnaires,
        }}
      />

      <AlertFeed sessions={alertFeedSessions} />

      <CaseloadSection patients={caseloadPatients} />
    </div>
  )
}
