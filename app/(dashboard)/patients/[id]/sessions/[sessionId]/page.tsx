import dynamic from "next/dynamic"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { computeAlerts } from "@/lib/alert-rules"
import { scaleNameToEnum } from "@/lib/patient-summary"
import { SessionDetailHeader } from "@/components/sessions/session-detail-header"
import { ScoreSummaryCard } from "@/components/sessions/score-summary-card"
import { ItemScoresSection } from "@/components/sessions/item-scores-section"
import type { ItemScoreRow } from "@/components/sessions/item-scores-section"
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
  title: "Session",
}

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string; sessionId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  const assessmentSession = await prisma.assessmentSession.findFirst({
    where: {
      id: params.sessionId,
      patientId: params.id,
      psychologistId: session.user.id,
    },
    include: {
      response: true,
      patient: true,
      scale: {
        include: {
          items: { orderBy: { order: "asc" } },
        },
      },
    },
  })

  if (!assessmentSession || !assessmentSession.response) notFound()

  const itemScores = assessmentSession.response.itemScores as Record<string, number>
  const scaleEnum = scaleNameToEnum(assessmentSession.scale.name)
  const alerts = computeAlerts(
    scaleEnum,
    assessmentSession.response.totalScore,
    itemScores,
    assessmentSession.response.severity,
  )

  const itemLabelMap = buildItemLabelMap(assessmentSession.scale.items)
  const itemRows: ItemScoreRow[] = Object.entries(itemScores).map(([key, score]) => ({
    key,
    label: itemLabelMap[key] ?? `Item ${key}`,
    score,
    isSafetyItem: alerts.suicidalIdeation && key === "9",
  }))

  const clinicalPayload = {
    scale: scaleEnum,
    scaleName: assessmentSession.scale.name,
    totalScore: assessmentSession.response.totalScore,
    severity: assessmentSession.response.severity,
    itemScores,
    itemLabels: itemLabelMap,
    suicidalIdeation: alerts.suicidalIdeation,
  }

  const severity = toSeverityLevel(alerts.severity)

  return (
    <div className="flex flex-col gap-6">
      <SessionDetailHeader
        patientId={params.id}
        anonymousId={assessmentSession.patient.anonymousId}
        scaleName={assessmentSession.scale.name}
        completedAt={assessmentSession.response.completedAt}
        severity={severity}
      />

      {alerts.suicidalIdeation && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle />
          <AlertTitle>Suicidal ideation endorsed</AlertTitle>
          <AlertDescription>
            Immediate clinical attention required. Review item scores and follow
            your safety protocol.
          </AlertDescription>
        </Alert>
      )}

      <ScoreSummaryCard
        totalScore={assessmentSession.response.totalScore}
        severity={severity}
        scaleName={assessmentSession.scale.name}
      />

      <ItemScoresSection items={itemRows} />

      <NarrativePanel
        clinicalPayload={clinicalPayload}
        sessionId={assessmentSession.id}
        patientId={params.id}
        initialReviewed={!!assessmentSession.response.reviewedAt}
        initialEscalated={!!assessmentSession.response.escalatedAt}
      />
    </div>
  )
}
