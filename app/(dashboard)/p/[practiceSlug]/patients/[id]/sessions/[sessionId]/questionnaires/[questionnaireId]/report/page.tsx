import type { Metadata } from "next"
import { practiceHref } from "@/lib/practice-path-server"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { can } from "@/lib/roles"
import { computeAlerts } from "@/lib/alert-rules"
import { scaleNameToEnum } from "@/lib/patient-summary"
import { PrintButton } from "@/components/sessions/print-button"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ClinicalNarrative } from "@/app/api/narrative/route"

export const metadata: Metadata = {
  title: "Questionnaire report",
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <p className="text-sm leading-relaxed">{children}</p>
    </section>
  )
}

export default async function QuestionnaireReportPage({
  params,
}: {
  params: { id: string; sessionId: string; questionnaireId: string }
}) {
  const ctx = await requirePracticeContext()
  if (!can(ctx.role, "viewScores")) notFound()
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
      scale: { include: { items: { orderBy: { order: "asc" } } } },
    },
  })

  if (!questionnaire || !questionnaire.response) notFound()

  const response = questionnaire.response
  const itemScores = response.itemScores as Record<string, number | string>
  const alerts = computeAlerts(
    scaleNameToEnum(questionnaire.scale.name),
    response.totalScore,
    itemScores as Record<string, number>,
    response.severity,
  )
  const itemLabelMap = Object.fromEntries(
    questionnaire.scale.items.map((item) => [String(item.order), item.text]),
  )
  const narrative = response.narrative as ClinicalNarrative | null

  return (
    <div className="print-report mx-auto flex max-w-3xl flex-col gap-6">
      <div className="print-hidden flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1 px-2" asChild>
          <Link
            href={practiceHref(`/patients/${params.id}/sessions/${params.sessionId}/questionnaires/${params.questionnaireId}`)}
          >
            <ArrowLeft className="size-4" />
            Back to results
          </Link>
        </Button>
        <PrintButton />
      </div>

      <header className="space-y-1 border-b pb-4">
        <h1 className="text-xl font-semibold">
          {questionnaire.scale.name} — Questionnaire Report
        </h1>
        <p className="text-sm text-muted-foreground">
          Patient: {questionnaire.session.patient.anonymousId} ·{" "}
          {questionnaire.session.title} · Completed{" "}
          {response.completedAt.toLocaleDateString()}
        </p>
      </header>

      {alerts.suicidalIdeation && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          Suicidal ideation endorsed — review item scores and follow your safety protocol.
        </p>
      )}

      <section className="flex items-baseline gap-6 rounded-md border p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total score
          </p>
          <p className="text-2xl font-semibold">{response.totalScore}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Severity
          </p>
          <p className="text-2xl font-semibold capitalize">{response.severity}</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Item scores</h2>
        <Table>
          <TableHeader>
            <TableRow className="text-xs uppercase tracking-wide text-muted-foreground hover:bg-transparent">
              <TableHead className="h-auto py-1.5 pr-2 font-semibold text-muted-foreground">
                Item
              </TableHead>
              <TableHead className="h-auto w-24 py-1.5 font-semibold text-muted-foreground">
                Answer
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(itemScores).map(([key, score]) => (
              <TableRow key={key} className="border-border/60 hover:bg-transparent">
                <TableCell className="whitespace-normal py-1.5 pr-2 align-top">
                  {itemLabelMap[key] ?? `Item ${key}`}
                </TableCell>
                <TableCell className="py-1.5 align-top tabular-nums">{score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">AI Clinical Summary</h2>
        {narrative ? (
          <div className="space-y-4">
            <ReportSection title="Overall severity">{narrative.overallSeverity}</ReportSection>
            <ReportSection title="Item-level patterns">{narrative.itemPatterns}</ReportSection>
            {narrative.trend && (
              <ReportSection title="Trend across sessions">{narrative.trend}</ReportSection>
            )}
            <ReportSection title="Safety">{narrative.safety}</ReportSection>
            <ReportSection title={`Recommended follow-up (${narrative.followUpPriority})`}>
              {narrative.followUpRationale}
            </ReportSection>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No AI summary has been generated for this questionnaire yet. Open
            the{" "}
            <Link
              href={practiceHref(`/patients/${params.id}/sessions/${params.sessionId}/questionnaires/${params.questionnaireId}`)}
              className="underline"
            >
              results page
            </Link>{" "}
            to generate one.
          </p>
        )}
      </section>

      <footer className="border-t pt-3 text-xs text-muted-foreground">
        AI-generated summary for clinician review only — verify against raw scores and clinical
        judgment.
        {response.narrativeGeneratedAt &&
          ` Summary generated ${response.narrativeGeneratedAt.toLocaleString()}.`}{" "}
        Report printed {new Date().toLocaleDateString()}.
      </footer>
    </div>
  )
}
