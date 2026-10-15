import dynamic from "next/dynamic"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AlertTriangle, Lock } from "lucide-react"
import { requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { can, ROLE_LABELS } from "@/lib/roles"
import { computeAlerts } from "@/lib/alert-rules"
import { scaleNameToEnum } from "@/lib/patient-summary"
import { QuestionnaireDetailHeader } from "@/components/sessions/questionnaire-detail-header"
import { ScoreSummaryCard } from "@/components/sessions/score-summary-card"
import { ItemScoresSection } from "@/components/sessions/item-scores-section"
import type { ItemScoreRow } from "@/components/sessions/item-scores-section"
import { NotesSection } from "@/components/notes/notes-section"
import { EmptyState } from "@/components/layout/empty-state"
import { questionnaireTarget } from "@/components/notes/note-target"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { SeverityLevel } from "@/components/ui/severity-badge"
import { Skeleton } from "@/components/ui/skeleton"

const NarrativePanel = dynamic(
  () =>
    import("@/components/sessions/narrative-panel").then((m) => ({
      default: m.NarrativePanel,
    })),
  {
    loading: () => <Skeleton className="h-48 w-full rounded-lg" />,
  },
)

function toSeverityLevel(severity: string | null): SeverityLevel | null {
  if (severity === "critical" || severity === "high" || severity === "moderate") {
    return severity
  }
  if (severity === "low") return "low"
  return null
}

function buildItemLabelMap(
  items: { order: number; text: string }[],
): Record<string, string> {
  return Object.fromEntries(
    items.map((item) => [String(item.order), item.text]),
  )
}

export const metadata: Metadata = {
  title: "Questionnaire",
}

export default async function QuestionnaireDetailPage({
  params,
}: {
  params: { id: string; sessionId: string; questionnaireId: string }
}) {
  const ctx = await requirePracticeContext()
  const db = scopedDb(ctx)

  const questionnaire = await db.questionnaire.findFirst({
    where: {
      id: params.questionnaireId,
      sessionId: params.sessionId,
      session: { patientId: params.id, psychologistId: ctx.userId },
    },
    include: {
      response: true,
      session: { include: { patient: true } },
      scale: {
        include: {
          items: { orderBy: { order: "asc" } },
        },
      },
    },
  })

  if (!questionnaire || !questionnaire.response) notFound()

  const itemScores = questionnaire.response.itemScores as Record<string, number>
  const scaleEnum = scaleNameToEnum(questionnaire.scale.name)
  const alerts = computeAlerts(
    scaleEnum,
    questionnaire.response.totalScore,
    itemScores,
    questionnaire.response.severity,
  )

  const itemLabelMap = buildItemLabelMap(questionnaire.scale.items)
  const itemRows: ItemScoreRow[] = Object.entries(itemScores).map(([key, score]) => ({
    key,
    label: itemLabelMap[key] ?? `Item ${key}`,
    score,
    isSafetyItem: alerts.suicidalIdeation && key === "9",
  }))

  const severity = toSeverityLevel(alerts.severity)
  const noteTarget = questionnaireTarget(questionnaire, questionnaire.session)

  const showScores = can(ctx.role, "viewScores")
  const showNotes = can(ctx.role, "viewNotes")

  return (
    <div className="flex flex-col gap-6">
      <QuestionnaireDetailHeader
        patientId={params.id}
        sessionId={params.sessionId}
        questionnaireId={questionnaire.id}
        anonymousId={questionnaire.session.patient.anonymousId}
        sessionTitle={questionnaire.session.title}
        scaleName={questionnaire.scale.name}
        completedAt={questionnaire.response.completedAt}
        severity={showScores ? severity : null}
        showReport={showScores}
      />

      {/*
        Everything below the header is clinical content, so a role holding
        neither capability would otherwise land on a page that renders nothing
        but a title — indistinguishable from a broken page. Name the boundary
        instead of leaving a void.
      */}
      {!showScores && !showNotes && (
        <EmptyState
          icon={<Lock className="size-5" />}
          title="Clinical results are restricted"
          description={`Scores, item responses and notes are visible to clinicians, supervisors and owners. You are a ${ROLE_LABELS[ctx.role]} at this practice, so you can see that this questionnaire was completed but not its results. Ask an owner to change your role if you need access.`}
        />
      )}

      {showScores && alerts.suicidalIdeation && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle />
          <AlertTitle>Suicidal ideation endorsed</AlertTitle>
          <AlertDescription>
            Immediate clinical attention required. Review item scores and follow
            your safety protocol.
          </AlertDescription>
        </Alert>
      )}

      {showScores && (
        <>
          <ScoreSummaryCard
            totalScore={questionnaire.response.totalScore}
            severity={severity}
            scaleName={questionnaire.scale.name}
          />

          <ItemScoresSection items={itemRows} />

          <NarrativePanel
            sessionId={params.sessionId}
            questionnaireId={questionnaire.id}
            patientId={params.id}
            initialReviewed={!!questionnaire.response.reviewedAt}
          />
        </>
      )}

      {showNotes && (
        <NotesSection
          patientId={params.id}
          defaultTarget={noteTarget}
          targets={[noteTarget]}
          title="Questionnaire notes"
          emptyDescription="Nothing recorded against this questionnaire yet."
        />
      )}
    </div>
  )
}
