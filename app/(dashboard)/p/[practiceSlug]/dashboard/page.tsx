import type { Metadata } from "next"
import { practiceHref } from "@/lib/practice-path-server"

export const metadata: Metadata = {
  title: "Dashboard",
}
import Link from "next/link"
import { requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { patientVisibilityWhere } from "@/lib/patient-access"
import { Button } from "@/components/ui/button"
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
import { deriveAlertCounts } from "@/lib/alerts"

export default async function DashboardPage() {
  const ctx = await requirePracticeContext()
  const db = scopedDb(ctx)

  const visibility = await patientVisibilityWhere(db, ctx)
  const patients = await db.patient.findMany({
    where: visibility,
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

  // Routed through lib/alerts so the dashboard, the sidebar badge, and anything
  // added later share one definition of "critical".
  const alertCounts = deriveAlertCounts(
    currentSessions.map((q) => ({
      totalScore: q.response!.totalScore,
      itemScores: q.response!.itemScores,
      severity: q.response!.severity,
      completedAt: q.response!.completedAt ?? null,
      questionnaire: {
        scaleId: q.scaleId,
        scale: { name: q.scale.name },
        session: { patientId: q.patientId },
      },
    })),
  )

  const caseloadPatients = shapePatientList(
    patients.map((p) => ({
      ...p,
      questionnaires: flattenQuestionnaires(p.clinicalSessions),
    })),
  )
    .map(toCaseloadPatient)
    .sort(bySeverityThenRecency)

  // First run: a band of zeroes and an empty alert queue tell a new clinician
  // nothing about what to do. Replace the whole dashboard with the one action
  // that unblocks every other surface.
  if (patients.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={`Welcome to APAS, ${ctx.name}`}
          description="Two steps to your first tracked assessment."
        />

        <div className="rounded-xl border bg-card p-6 md:p-8">
          <ol className="flex flex-col gap-6">
            <li className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                1
              </span>
              <div className="flex flex-col items-start gap-2">
                <p className="font-medium">Add a patient</p>
                <p className="max-w-prose text-sm text-muted-foreground">
                  Patients are pseudonymous by default — APAS assigns an ID, and
                  identifying details are only collected later with explicit
                  consent.
                </p>
                <Button asChild>
                  <Link href={practiceHref("/patients")}>Add your first patient</Link>
                </Button>
              </div>
            </li>

            <li className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold text-muted-foreground">
                2
              </span>
              <div className="flex flex-col items-start gap-2">
                <p className="font-medium">Send an assessment</p>
                <p className="max-w-prose text-sm text-muted-foreground">
                  Send a secure link for PHQ-9, GAD-7, BDI-II, or any scale you
                  build yourself. Responses are scored on arrival and anything
                  crossing a clinical threshold is raised here.
                </p>
                <Button variant="outline" asChild>
                  <Link href={practiceHref("/scales")}>Browse the scale library</Link>
                </Button>
              </div>
            </li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* The sticky header already names the page; repeating "Dashboard" here
          was pure duplication. Keep the greeting as the only lead-in. */}
      <PageHeader
        title={`Welcome back, ${ctx.name}`}
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
