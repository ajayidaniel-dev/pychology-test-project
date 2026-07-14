import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { computeAlerts } from "@/lib/alert-rules"
import { scaleNameToEnum } from "@/lib/patient-summary"
import { PrintButton } from "@/components/sessions/print-button"
import { Button } from "@/components/ui/button"
import type { ClinicalNarrative } from "@/app/api/narrative/route"

export const metadata: Metadata = {
  title: "Session report",
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

export default async function SessionReportPage({
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
      scale: { include: { items: { orderBy: { order: "asc" } } } },
    },
  })

  if (!assessmentSession || !assessmentSession.response) notFound()

  const response = assessmentSession.response
  const itemScores = response.itemScores as Record<string, number | string>
  const alerts = computeAlerts(
    scaleNameToEnum(assessmentSession.scale.name),
    response.totalScore,
    itemScores as Record<string, number>,
    response.severity,
  )
  const itemLabelMap = Object.fromEntries(
    assessmentSession.scale.items.map((item) => [String(item.order), item.text]),
  )
  const narrative = response.narrative as ClinicalNarrative | null

  return (
    <div className="print-report mx-auto flex max-w-3xl flex-col gap-6">
      <div className="print-hidden flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1 px-2" asChild>
          <Link href={`/patients/${params.id}/sessions/${params.sessionId}`}>
            <ArrowLeft className="size-4" />
            Back to session
          </Link>
        </Button>
        <PrintButton />
      </div>

      <header className="space-y-1 border-b pb-4">
        <h1 className="text-xl font-semibold">{assessmentSession.scale.name} — Session Report</h1>
        <p className="text-sm text-muted-foreground">
          Patient: {assessmentSession.patient.anonymousId} · Completed{" "}
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
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-1.5 pr-2 font-semibold">Item</th>
              <th className="py-1.5 font-semibold">Answer</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(itemScores).map(([key, score]) => (
              <tr key={key} className="border-b border-border/60">
                <td className="py-1.5 pr-2">{itemLabelMap[key] ?? `Item ${key}`}</td>
                <td className="py-1.5">{score}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
            No AI summary has been generated for this session yet. Open the{" "}
            <Link
              href={`/patients/${params.id}/sessions/${params.sessionId}`}
              className="underline"
            >
              session page
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
