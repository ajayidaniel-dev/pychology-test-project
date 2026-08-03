import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Link2Off } from "lucide-react"
import { getPracticeContext, requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { isTokenExpired } from "@/lib/token"
import { computeAlerts } from "@/lib/alert-rules"
import { scaleNameToEnum } from "@/lib/patient-summary"
import { sendStatus } from "@/lib/direct-sends"
import { SessionHeader } from "@/components/sessions/session-header"
import { SessionQuestionnairesSection } from "@/components/sessions/session-questionnaires-section"
import type { SessionQuestionnaireRow } from "@/components/sessions/session-questionnaires-section"
import { NotesSection } from "@/components/notes/notes-section"
import { sessionTarget } from "@/components/notes/note-target"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export async function generateMetadata({
  params,
}: {
  params: { id: string; sessionId: string }
}): Promise<Metadata> {
  const ctx = await getPracticeContext()
  if (!ctx) return { title: "Session" }
  const db = scopedDb(ctx)

  const clinicalSession = await db.clinicalSession.findFirst({
    where: {
      id: params.sessionId,
      patientId: params.id,
      psychologistId: ctx.userId,
    },
    select: { title: true },
  })

  return { title: clinicalSession?.title ?? "Session" }
}

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string; sessionId: string }
}) {
  const ctx = await requirePracticeContext()
  const db = scopedDb(ctx)

  const clinicalSession = await db.clinicalSession.findFirst({
    where: {
      id: params.sessionId,
      patientId: params.id,
      psychologistId: ctx.userId,
    },
    include: {
      patient: { select: { anonymousId: true } },
      questionnaires: {
        include: { response: true, scale: true },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!clinicalSession) notFound()

  const rows: SessionQuestionnaireRow[] = clinicalSession.questionnaires.map(
    (q) => {
      // Severity is recomputed from the raw item scores rather than trusted
      // from storage, matching how every other surface reports it.
      const severity = q.response
        ? computeAlerts(
            scaleNameToEnum(q.scale.name),
            q.response.totalScore,
            q.response.itemScores as Record<string, number>,
            q.response.severity,
          ).severity
        : null

      return {
        id: q.id,
        order: q.order,
        scaleName: q.scale.name,
        status: q.status,
        score: q.response?.totalScore ?? null,
        severity,
      }
    },
  )

  const pendingCount = rows.filter((r) => r.status === "PENDING").length
  const linkExpired = isTokenExpired(clinicalSession.tokenExpiresAt)
  const noteTarget = sessionTarget(clinicalSession)

  // The same record backs both, so this page serves a booked appointment and a
  // direct send alike — only the wording changes.
  const isDirect = clinicalSession.kind === "DIRECT"
  const noun = isDirect ? "send" : "session"

  return (
    <div className="flex flex-col gap-6">
      <SessionHeader
        patientId={params.id}
        sessionId={clinicalSession.id}
        anonymousId={clinicalSession.patient.anonymousId}
        title={clinicalSession.title}
        reason={clinicalSession.reason}
        scheduledAt={clinicalSession.scheduledAt}
        status={clinicalSession.status}
        token={clinicalSession.token}
        linkExpired={linkExpired}
        hasPendingQuestionnaires={pendingCount > 0}
        kind={clinicalSession.kind}
        sendStatus={sendStatus(clinicalSession)}
      />

      {linkExpired && pendingCount > 0 && (
        <Alert>
          <Link2Off />
          <AlertTitle>This {noun}&apos;s link has expired</AlertTitle>
          <AlertDescription>
            {pendingCount} questionnaire{pendingCount === 1 ? "" : "s"} went
            unanswered. Renew the link from the actions menu to send it again.
          </AlertDescription>
        </Alert>
      )}

      <SessionQuestionnairesSection
        patientId={params.id}
        sessionId={clinicalSession.id}
        questionnaires={rows}
        token={clinicalSession.token}
        linkExpired={linkExpired || clinicalSession.status === "CANCELLED"}
        kind={clinicalSession.kind}
      />

      <NotesSection
        patientId={params.id}
        defaultTarget={noteTarget}
        targets={[noteTarget]}
        title={isDirect ? "Notes" : "Session notes"}
        emptyDescription={`Nothing recorded for this ${noun} yet.`}
      />
    </div>
  )
}
